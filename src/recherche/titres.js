// src/recherche/titres.js
// Le NOM d'une méthode — pas l'énumération de ses opérations.
//
// Le README ne dit pas « On prend les lettres une par une, Numérologie
// chaldéenne, On fait la moyenne ». Il dit « Méthode 1 — Le détour
// linguistique », « Méthode 5 — L'affichage 7 segments », « Méthode 6 —
// L'astuce AZERTY et le retournement du 9 ». Un titre NOMME et RACONTE ; il
// permet de choisir une démonstration sans l'ouvrir. La liste des opérations,
// elle, garde toute sa valeur — mais en sous-titre (`regleApproche`).
//
// Le titre est donc dérivé de la SIGNATURE du chemin, jamais de la
// concaténation des libellés :
//
//   1. une VEDETTE — l'opérateur qui donne son nom à la méthode : le mappeur
//      principal, à défaut la mesure, à défaut le dénombrement ; un filtre
//      caractéristique (traduction, Atbash, César…) l'emporte sur tout, parce
//      que c'est lui que le spectateur retiendra ;
//   2. un QUALIFIANT — la pirouette qui distingue deux emplois de la même
//      vedette (« par soustraction », « et le retournement du 9 ») ;
//   3. une MENTION D'ASSEMBLAGE — comment les trois 6 sont obtenus. C'est là
//      que le mode `TRIPLEMENT` est dit à voix haute : « le même 6, trois
//      fois ». Un décret assumé reste montrable ; un décret déguisé, non.
//
// Bilingue `{fr, en}` comme le reste du catalogue (`src/moteur/i18n.js`).
// Aucune source d'entropie, aucun `Intl`, aucun `localeCompare` (CONTRACTS
// §4.4 règle 4) : deux exécutions produisent le même titre au caractère près.

/**
 * Une chaîne affichable du catalogue est un couple `{fr, en}`. Le moteur de
 * recherche code contre le contrat, pas contre le module `src/moteur/i18n.js` :
 * d'où cette lecture locale, tolérante à une chaîne nue (même convention que
 * `scenario.js`).
 */
export const LANGUE_DEFAUT = 'fr';

export function dire(texte, langue = LANGUE_DEFAUT) {
  if (texte === null || texte === undefined) return null;
  if (typeof texte === 'string') return texte;
  if (typeof texte !== 'object') return null;
  return texte[langue] ?? texte[LANGUE_DEFAUT] ?? texte.en ?? null;
}

const b = (fr, en) => ({ fr, en });

// ══════════════════════════════════ 1. les vedettes

/**
 * Priorité de vedette, du plus parlant au moins. Un opérateur absent de cette
 * table ne peut pas donner son nom à la méthode tant qu'un autre le peut.
 */
const PRIORITE = {
  'f.traduitFR': 0, 'f.traduitEN': 0, 'f.atbash': 0, 'f.rot13': 0, 'f.leet': 0,
  'f.motRepete': 1, 'f.initiales': 1,
  joker: 0,
  mappeur: 2,
  mesure: 3,
  combinateur: 4,
  decoupe: 6,
  filtre: 7,
  finisseur: 8,
};

/** Deux mappeurs de service qui ne nomment rien : ils retouchent un résultat. */
const MAPPEURS_DE_SERVICE = new Set(['m.reduireChaque', 'm.retirerZeros']);

/** Nom de méthode par opérateur vedette. */
const NOMS = {
  // ── filtres caractéristiques
  'f.traduitFR': b('Le détour linguistique', 'The linguistic detour'),
  'f.traduitEN': b('Le détour linguistique', 'The linguistic detour'),
  'f.atbash': b('Le chiffre Atbash', 'The Atbash cipher'),
  'f.rot13': b('Le chiffre de César', 'The Caesar cipher'),
  'f.leet': b('Le décodage leetspeak', 'The leetspeak decoding'),
  'f.motRepete': b('Le motif qui revient', 'The pattern that recurs'),
  'f.initiales': b('La règle des initiales', 'The rule of initials'),

  // ── mesures (STR → NUM)
  'n.longueur': b('Le compte des lettres', 'The letter count'),
  'n.voyelles': b('Le compte des voyelles', 'The vowel count'),
  'n.consonnes': b('Le compte des consonnes', 'The consonant count'),
  'n.lettresDistinctes': b('Le compte des lettres distinctes', 'The distinct-letter count'),
  'n.separateurs': b('Le compte des séparateurs', 'The separator count'),
  'n.mots': b('Le compte des mots', 'The word count'),
  'n.lettresPlusVoyelles': b('Le compte des lettres et des voyelles', 'Counting letters and vowels'),
  'n.lettresPlusConsonnes': b('Le compte des lettres et des consonnes', 'Counting letters and consonants'),

  // ── mappeurs (la table de conversion qui fait la méthode)
  // ★ « La gématrie simple » — et non « la numérologie latine », qui a servi un
  // temps. Deux raisons. La première : une fois que `m.englishX6` s'appelle « la
  // gématrie anglaise », les deux barèmes A=1…Z=26 et A=6…Z=156 se retrouvent
  // côte à côte dans la liste sans rien qui les relie ; « simple » et
  // « anglaise » disent d'un coup d'œil que c'est la même famille, l'une nue,
  // l'autre multipliée — et c'est le nom que ce barème porte réellement chez
  // ceux qui pratiquent. La seconde : dans « pythagoricienne, chaldéenne,
  // latine », les deux premières nomment des TRADITIONS et la troisième un
  // ALPHABET ; le lecteur croyait voir une troisième tradition là où il n'y a
  // que le rang de la lettre. L'identifiant `m.a1z26` et le code d'URL `m1`, eux,
  // ne changent JAMAIS — registre append-only (CONTRACTS §4.1).
  'm.a1z26': b('La gématrie simple', 'Simple gematria'),
  'm.z26a1': b('L’alphabet à rebours', 'The alphabet backwards'),
  'm.pythagore': b('La numérologie pythagoricienne', 'Pythagorean numerology'),
  'm.chaldeen': b('La numérologie chaldéenne', 'Chaldean numerology'),
  'm.englishX6': b('La gématrie anglaise', 'English gematria'),
  'm.scrabbleFR': b('Le compte du Scrabble français', 'The French Scrabble count'),
  'm.scrabbleEN': b('Le compte du Scrabble anglais', 'The English Scrabble count'),
  'm.t9': b('Les touches du téléphone', 'The phone keypad'),
  'm.morseSignaux': b('Le morse', 'Morse code'),
  'm.morseTraits': b('Les traits du morse', 'Morse dashes'),
  'm.asciiMaj': b('Le code ASCII, en capitales', 'ASCII, in capitals'),
  'm.asciiMin': b('Le code ASCII, en bas de casse', 'ASCII, in lower case'),
  'm.seg7': b('L’affichage à sept segments', 'The seven-segment display'),
  'm.seg7Fusion': b('L’affichage à sept segments, traits fusionnés',
    'The seven-segment display, strokes merged'),
  'm.seg14': b('L’affichage à quatorze segments', 'The fourteen-segment display'),
  'm.seg14Fusion': b('L’affichage à quatorze segments, traits fusionnés',
    'The fourteen-segment display, strokes merged'),
  'm.traitsMaj': b('Les traits de crayon, en capitales', 'Pen strokes, in capitals'),
  'm.traitsMin': b('Les traits de crayon, en bas de casse', 'Pen strokes, in lower case'),
  'm.extremitesMaj': b('Les extrémités libres, en capitales', 'Free ends, in capitals'),
  'm.extremitesMin': b('Les extrémités libres, en bas de casse', 'Free ends, in lower case'),
  'm.bouclesMaj': b('Les boucles fermées, en capitales', 'Closed loops, in capitals'),
  'm.bouclesMin': b('Les boucles fermées, en bas de casse', 'Closed loops, in lower case'),
  'm.azertyColonne': b('La géographie de l’AZERTY', 'AZERTY geography'),
  'm.azertyRangee': b('Les rangées de l’AZERTY', 'The AZERTY rows'),
  'm.qwertyColonne': b('La géographie du QWERTY', 'QWERTY geography'),
  'm.qwertyRangee': b('Les rangées du QWERTY', 'The QWERTY rows'),
  'm.hebreu': b('La gématrie hébraïque', 'Hebrew gematria'),
  'm.grec': b('L’isopséphie grecque', 'Greek isopsephy'),
  'm.longueurNom': b('Le nom des lettres', 'The names of the letters'),
  'm.longueurToken': b('La longueur des mots', 'The length of the words'),
  'm.toucheChiffre': b('L’astuce AZERTY', 'The AZERTY trick'),
  'm.reduireChaque': b('La réduction chiffre à chiffre', 'Digit-by-digit reduction'),
  'm.retirerZeros': b('Le retrait des zéros', 'Dropping the zeros'),
  // Le pluriel distingue la vedette (un vecteur entier de 9 se retourne) du
  // qualifiant de `p.retournement`, « et le retournement du 9 », qui ne parle
  // que d'un nombre isolé. Deux méthodes, deux noms — sans quoi une liste
  // pourrait porter deux fois la même ligne.
  'm.retournerLesNeuf': b('Le retournement des 9', 'The flipping of the 9s'),

  // ── combinateurs qui, faute de mappeur, font la méthode à eux seuls
  'c.compteTokens': b('Le simple dénombrement', 'Plain counting'),
  'c.compteTokensDistincts': b('Le dénombrement des jetons distincts', 'Counting the distinct tokens'),
  'c.somme': b('La simple addition', 'Plain addition'),
  'c.soustraction': b('La soustraction', 'The subtraction'),
  'c.produit': b('La multiplication', 'The multiplication'),
  'c.alternee': b('L’alternance des signes', 'The alternating signs'),
  'c.maxMoinsMin': b('L’écart des valeurs', 'The spread of the values'),
  'c.moyenne': b('La moyenne', 'The average'),
  'c.cardinal': b('Le nombre de valeurs', 'The number of values'),
  'c.concat': b('Les chiffres collés', 'The digits glued together'),
  'c.max': b('La plus grande valeur', 'The largest value'),
  'c.min': b('La plus petite valeur', 'The smallest value'),

  // ── découpes, faute de tout le reste
  't.caracteres': b('La lecture lettre à lettre', 'Reading letter by letter'),
  't.mots': b('La lecture mot à mot', 'Reading word by word'),
  't.separateurs': b('La lecture des séparateurs', 'Reading the separators'),
  't.syllabes': b('La lecture syllabe à syllabe', 'Reading syllable by syllable'),
  't.chiffres': b('L’éclatement en chiffres', 'Breaking into digits'),

  // ── le joker (CONTRACTS §0.4 : affiché et assumé)
  'j.nomFrancais': b('Le joker français', 'The French joker'),
};

// ══════════════════════════════════ 2. les qualifiants

/**
 * La pirouette qui distingue deux emplois de la même vedette. Un seul est
 * retenu — celui de plus faible rang —, sinon le titre redevient l'énumération
 * qu'on cherchait justement à éviter.
 *
 * Les réductions ordinaires (`p.racineNumerique`, `p.sommeChiffres`,
 * `p.racineMaitres`) n'y figurent pas : elles sont la grammaire commune de la
 * numérologie, elles ne distinguent rien.
 */
const QUALIFIANTS = {
  'p.retournement': [0, b('et le retournement du 9', 'and the flipping of the 9')],
  'p.miroir': [1, b('lu à l’envers', 'read backwards')],
  'p.complement9': [1, b('par complément à neuf', 'by the nines complement')],
  'p.ecartChiffres': [1, b('par l’écart des chiffres', 'by the gap between the digits')],
  'p.modulo9': [2, b('modulo neuf', 'modulo nine')],
  'p.modulo10': [2, b('au dernier chiffre', 'down to the last digit')],
  'p.abs': [2, b('en valeur absolue', 'in absolute value')],
  'p.reductionSignee': [2, b('en gardant le signe', 'keeping the sign')],
  'c.soustraction': [3, b('par soustraction', 'by subtraction')],
  'c.produit': [3, b('par multiplication', 'by multiplication')],
  'c.alternee': [3, b('en alternant les signes', 'alternating the signs')],
  'c.maxMoinsMin': [3, b('par l’écart', 'by the spread')],
  'c.moyenne': [3, b('en moyenne', 'on average')],
  'c.concat': [3, b('chiffres collés', 'digits glued together')],
  'c.max': [3, b('au plus grand', 'at the largest')],
  'c.min': [3, b('au plus petit', 'at the smallest')],
  'c.cardinal': [3, b('au nombre de valeurs', 'by the number of values')],
};

// ══════════════════════════════════ 3. les mentions d'assemblage

const MENTIONS = {
  // Le décret n'est plus PRODUIT (`assemblage.js`) ; la mention survit pour les
  // liens partagés avant sa suppression, que `rejouer` continue d'ouvrir.
  decret: b('le même 6, trois fois', 'the same 6, three times over'),
  direct: b('666 d’un seul tenant', '666 in one go'),
  groupement: b('les 6 groupés par trois', 'the 6s grouped in threes'),
  // La convergence NOMME ce qui se passe au lieu d'énumérer : trois lectures
  // indépendantes de la même chaîne qui tombent toutes sur 6.
  convergence: b('trois voies convergent', 'three roads converge'),
  sixOfferts: b('tirets du 6 compris', 'dash-key sixes included'),
  uneAutre: b('et une autre règle', 'and one other rule'),
  deuxAutres: b('et deux autres règles', 'and two other rules'),
};

/** « deux séries de 666 » — quand le vecteur en porte de quoi faire plusieurs. */
function mentionSeries(n) {
  if (!n || n < 2) return MENTIONS.groupement;
  const motsFr = ['', '', 'deux', 'trois', 'quatre', 'cinq', 'six'];
  const motsEn = ['', '', 'two', 'three', 'four', 'five', 'six'];
  const fr = motsFr[n] || String(n);
  const en = motsEn[n] || String(n);
  return b(`${fr} séries de 666`, `${en} runs of 666`);
}

// ══════════════════════════════════ lecture d'un chemin

const opsDe = (approche) => {
  const out = [];
  for (const p of (approche.parts || [])) for (const o of p.chemin.ops) out.push(o);
  return out;
};

const signatureOps = (chemin) => chemin.ops.map((o) => o.id).join('>');

/**
 * La part qui donne son nom : celle dont la signature revient le plus souvent.
 * Sur une RÉSONANCE les trois parts sont identiques ; sur un assemblage
 * hétérogène, c'est la méthode majoritaire qui nomme, et la mention
 * d'assemblage dit qu'il y en a d'autres.
 */
function partPrincipale(approche) {
  const parts = approche.parts || [];
  if (!parts.length) return null;
  const compte = new Map();
  for (const p of parts) {
    const s = signatureOps(p.chemin);
    compte.set(s, (compte.get(s) || 0) + 1);
  }
  let meilleure = null;
  let meilleurCompte = -1;
  for (const p of parts) {
    const n = compte.get(signatureOps(p.chemin));
    if (n > meilleurCompte) { meilleurCompte = n; meilleure = p; }
  }
  return meilleure;
}

function priorite(op) {
  const p = PRIORITE[op.id];
  if (p !== undefined) return p;
  if (op.isJoker) return PRIORITE.joker;
  if (op.famille === 'mappeur' && MAPPEURS_DE_SERVICE.has(op.id)) return PRIORITE.filtre;
  const f = PRIORITE[op.famille];
  return f === undefined ? 9 : f;
}

/** L'opérateur qui donne son nom à la méthode. */
export function vedette(chemin) {
  let choisi = null;
  let rang = Infinity;
  for (const op of chemin.ops) {
    const r = priorite(op);
    if (r < rang) { rang = r; choisi = op; }
  }
  return choisi;
}

function qualifiant(chemin, idVedette) {
  let choisi = null;
  let rang = Infinity;
  for (const op of chemin.ops) {
    if (op.id === idVedette) continue;
    const q = QUALIFIANTS[op.id];
    if (q && q[0] < rang) { rang = q[0]; choisi = q[1]; }
  }
  return choisi;
}

// ══════════════════════════════════ le décret (défaut n° 1)

/**
 * L'approche ne produit-elle qu'UN SEUL 6, écrit trois fois par décret ?
 *
 * Le test est structurel, pas nominal : toutes les parts portent la même portée
 * ET le même programme, donc un seul calcul est montré. C'est la définition
 * exacte du reproche — « le site obtient un 6, puis affirme que ça fait 666 ».
 * Une approche à un seul fragment qui atteint LITTÉRALEMENT 666 n'est pas un
 * décret : elle démontre son résultat d'un seul tenant.
 */
export function estDecret(approche) {
  const parts = approche && approche.parts;
  if (!parts || !parts.length) return false;
  if (parts.length === 1) {
    // Une part unique ne décrète rien dans deux cas : elle atteint 666 d'un
    // seul tenant, ou son vecteur final porte déjà les trois 6 — trois 6
    // calculés, pas un 6 recopié (mode GROUPEMENT, `assemblage.js`).
    return !atteint666(parts[0].chemin) && !porteTroisSix(parts[0].chemin);
  }
  const cle = (p) => `${p.fragment.offset}.${p.fragment.longueur} `
    + p.chemin.ops.map((o) => o.code).join('+');
  const premier = cle(parts[0]);
  return parts.every((p) => cle(p) === premier);
}

function atteint666(chemin) {
  const fin = chemin.etats[chemin.etats.length - 1];
  return fin && fin.type === 'NUM' && fin.valeur === 666;
}

/**
 * L'état final est-il un vecteur portant au moins trois 6 ?
 *
 * Le critère est recalculé ici plutôt qu'importé d'`assemblage.js` : `score.js`
 * importe ce module, `assemblage.js` importe `score.js`, et refermer le triangle
 * créerait un cycle. Trois lignes valent mieux qu'un cycle.
 */
function porteTroisSix(chemin) {
  const fin = chemin && chemin.etats && chemin.etats[chemin.etats.length - 1];
  if (!fin || fin.type !== 'NUMS') return false;
  let n = 0;
  for (const x of fin.valeur) if (x === 6) n++;
  return n >= 3;
}

// ══════════════════════════════════ le titre

/**
 * Le titre bilingue d'une approche : un nom de méthode, pas une énumération.
 * @param {Object} approche
 * @returns {{fr:string, en:string}}
 */
export function titreBilingue(approche) {
  const part = partPrincipale(approche);
  if (!part) return b('Démonstration', 'Demonstration');
  const chemin = part.chemin;
  const tete = vedette(chemin);
  const nom = (tete && NOMS[tete.id])
    || (tete && tete.libelle)
    || b('Démonstration', 'Demonstration');

  const morceaux = [nom];
  const q = tete ? qualifiant(chemin, tete.id) : null;
  if (q) morceaux.push(q);

  // La distinction vient avant la mention d'assemblage : la mention est un aveu
  // sur la façon dont les trois 6 sont réunis, elle se lit mieux en dernier.
  if (approche.distinction) morceaux.push(approche.distinction);
  const mention = mentionAssemblage(approche, chemin);
  if (mention) morceaux.push(mention);

  return assembler(morceaux);
}

function mentionAssemblage(approche, cheminPrincipal) {
  if (approche.joker || (approche.mode === 'JOKER')) return null; // le nom le dit déjà
  // La MOISSON annonce ses séries : c'est ce qui la fait passer devant, le
  // lecteur doit donc pouvoir le lire sans ouvrir la démonstration.
  if (approche.mode === 'MOISSON') return mentionSeries(approche.series);
  if (atteint666(cheminPrincipal) && (approche.parts || []).length === 1) return MENTIONS.direct;
  if (porteTroisSix(cheminPrincipal) && (approche.parts || []).length === 1) {
    return mentionSeries(approche.series);
  }
  if (estDecret(approche)) return MENTIONS.decret;
  if (approche.mode === 'CONVERGENCE') return MENTIONS.convergence;
  const parts = approche.parts || [];
  const signatures = new Set(parts.map((p) => signatureOps(p.chemin)));
  if (approche.mode === 'SIX_OFFERT') return MENTIONS.sixOfferts;
  if (signatures.size === 2) return MENTIONS.uneAutre;
  if (signatures.size >= 3) return MENTIONS.deuxAutres;
  return null;
}

/**
 * Assemble les morceaux d'un titre. Le premier séparateur est un tiret cadratin
 * — c'est la ponctuation du README (« Méthode 6 — L'astuce AZERTY ») —, les
 * suivants une virgule.
 */
function assembler(morceaux) {
  const rendu = {};
  for (const langue of ['fr', 'en']) {
    const parts = morceaux.map((m) => dire(m, langue)).filter((x) => x && x.length);
    if (!parts.length) { rendu[langue] = langue === 'en' ? 'Demonstration' : 'Démonstration'; continue; }
    rendu[langue] = parts.length === 1
      ? parts[0]
      : `${parts[0]} — ${parts.slice(1).join(', ')}`;
  }
  return rendu;
}

/**
 * Le titre d'une approche dans une langue donnée.
 * Signature conservée depuis `scenario.js`, qui l'exporte toujours.
 */
export function titreApproche(approche, langue = LANGUE_DEFAUT) {
  return dire(titreBilingue(approche), langue)
    || (langue === 'en' ? 'Demonstration' : 'Démonstration');
}

/**
 * La règle affichée sous le titre : la suite des libellés de règle, dédoublonnée.
 * C'est le SOUS-TITRE — l'énumération garde sa valeur, elle ne fait juste plus
 * office de nom.
 */
export function regleApproche(approche, langue = LANGUE_DEFAUT) {
  const regles = [];
  for (const p of (approche.parts || [])) {
    for (const o of p.chemin.ops) {
      const r = dire(o.regle, langue);
      if (r && !regles.includes(r)) regles.push(r);
    }
  }
  return regles.join(' · ');
}

export function regleBilingue(approche) {
  return { fr: regleApproche(approche, 'fr'), en: regleApproche(approche, 'en') };
}

// ══════════════════════════════════ unicité dans une liste (défaut n° 4)

/**
 * Deux lignes d'une même liste ne peuvent pas porter le même titre : le visiteur
 * n'aurait aucun moyen de les distinguer sans les ouvrir.
 *
 * On ne numérote pas — « (2) » n'apprend rien. On cherche, pour chaque
 * homonyme, le PREMIER opérateur qui n'appartient qu'à lui dans le groupe, et
 * on le donne comme distinction. Faute d'opérateur propre (deux approches aux
 * mêmes opérateurs sur des fragments différents), on distingue par le texte des
 * fragments. En dernier recours seulement, par la suite des codes — qui est
 * unique par construction.
 *
 * La distinction est POSÉE SUR L'APPROCHE (`a.distinction`), jamais sur la
 * chaîne rendue : `titreApproche` reste une fonction pure de l'approche, si
 * bien qu'un changement de langue dans l'interface (`src/app/pont.js`)
 * recompose exactement le même titre, distinction comprise.
 *
 * @param {Object[]} approches liste ordonnée, mutée en place
 * @returns {Object[]} la même liste
 */
export function distinguerTitres(approches) {
  for (const a of approches) a.distinction = null;
  const groupes = new Map();
  for (const a of approches) {
    const cle = titreApproche(a, 'fr');
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(a);
  }
  for (const [, groupe] of groupes) {
    if (groupe.length < 2) continue;
    const ailleurs = groupe.map((a) => {
      const autres = new Set();
      for (const x of groupe) {
        if (x === a) continue;
        for (const o of opsDe(x)) autres.add(o.id);
      }
      return autres;
    });
    groupe.forEach((a, i) => {
      const propre = opsDe(a).find((o) => !ailleurs[i].has(o.id));
      if (propre) { a.distinction = propre.libelle; return; }
      // Rien en propre parce qu'on est le PLUS DÉPOUILLÉ du groupe : les autres
      // ajoutent un filtre, une pirouette, et nous non. C'est une différence
      // parfaitement nommable — « la règle seule » —, et il ne peut y en avoir
      // qu'un, puisqu'on exige d'être STRICTEMENT le plus court. Sans elle, la
      // ligne se distinguait par sa suite de codes : « L'alphabet à rebours —
      // t1+m2+mt », qui n'apprend rien à personne.
      const taille = (x) => new Set(opsDe(x).map((o) => o.id)).size;
      if (groupe.every((x) => x === a || taille(x) > taille(a))) {
        a.distinction = { fr: 'la règle seule', en: 'the rule on its own' };
        return;
      }
      const textes = [...new Set((a.parts || []).map((p) => p.fragment.texte))].join(' · ');
      const autresTextes = groupe
        .filter((x) => x !== a)
        .map((x) => [...new Set((x.parts || []).map((p) => p.fragment.texte))].join(' · '));
      if (textes && !autresTextes.includes(textes)) {
        a.distinction = { fr: `sur « ${textes} »`, en: `on “${textes}”` };
        return;
      }
      // ★ Ce qui distingue n'est pas toujours UN opérateur : c'est parfois une
      // COMBINAISON. À trois lignes ou plus, chaque opérateur peut se retrouver
      // ailleurs sans qu'aucune ligne se répète — `fk+t1+m8+my` face à
      // `fk+t1+m3+my` et `fk+t1+m8` : ni le clavier téléphonique ni le
      // retournement des 9 ne lui appartiennent, leur RENCONTRE si. On nomme
      // alors tout ce qui varie dans le groupe, c'est-à-dire ce que cette ligne
      // a en propre une fois retiré le fonds commun. C'est plus long qu'un nom,
      // mais ça se lit — au contraire de « fk+t1+m8+my », qui n'apprend rien à
      // personne et donne à voir la plomberie.
      const commun = new Set(opsDe(groupe[0]).map((o) => o.id));
      for (const x of groupe.slice(1)) {
        const siens = new Set(opsDe(x).map((o) => o.id));
        for (const id of [...commun]) if (!siens.has(id)) commun.delete(id);
      }
      const propres = [];
      const vus = new Set();
      for (const o of opsDe(a)) {
        if (commun.has(o.id) || vus.has(o.id)) continue;
        vus.add(o.id);
        propres.push(o.libelle);
      }
      if (propres.length) {
        a.distinction = {
          fr: propres.map((l) => dire(l, 'fr')).filter(Boolean).join(', '),
          en: propres.map((l) => dire(l, 'en')).filter(Boolean).join(', '),
        };
        if (a.distinction.fr) return;
      }
      // Dernier recours : la suite des codes, unique par construction. On n'y
      // arrive que si deux lignes ont exactement les mêmes opérateurs sur les
      // mêmes fragments — auquel cas il n'y a plus rien à dire d'elles.
      const codes = (a.parts || []).map((p) => p.chemin.ops.map((o) => o.code).join('+')).join(',');
      a.distinction = { fr: codes, en: codes };
    });
  }
  return approches;
}

/** Pose `titre` et `regle` bilingues sur chaque approche, titres rendus uniques. */
export function nommer(approches) {
  distinguerTitres(approches);
  for (const a of approches) {
    a.titre = titreBilingue(a);
    a.regle = regleBilingue(a);
  }
  return approches;
}
