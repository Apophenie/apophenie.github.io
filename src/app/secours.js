/** État dégradé.
 *
 *  Les modules `src/moteur/`, `src/recherche/` et `src/visuel/` sont écrits en
 *  parallèle par d'autres agents. Tant qu'ils manquent, l'interface ne doit ni
 *  planter ni mentir : elle affiche un bandeau explicite et se rabat sur ce
 *  fichier — un jeu d'essai figé, tiré des sept méthodes du cahier des charges,
 *  et un lecteur sans animation qui pilote uniquement Le Registre.
 *
 *  RIEN ICI N'EST UN CALCUL. C'est du contenu de démonstration d'interface. */

export const SAISIE_ESSAI = 'hope-hope-hope.fr';

/* Les libellés du jeu d'essai portent la MÊME forme `{fr, en}` que ceux du
   catalogue arithmétique (CONTRACTS §2.2) : l'interface les consomme par
   `src/app/libelles.js`, sans savoir d'où ils viennent. Les lignes de calcul
   purement formelles — `8 + 15 + 16 + 5 = 44` — restent des chaînes nues :
   elles n'ont pas de langue. */

const V = (rang, titre, regle, resume, programme, etapes) =>
  ({ rang, titre, regle, resume, programme, resultat: '666', etapes });

/** Les sept approches du cahier des charges, telles quelles. */
export const APPROCHES_ESSAI = [
  V(1,
    { fr: 'Le détour linguistique', en: 'The linguistic detour' },
    { fr: 'On traduit le mot anglais en français.',
      en: 'The English word is translated into French.' },
    { fr: 'hope → espoir → 6 lettres, ×3', en: 'hope → espoir → 6 letters, ×3' },
    '×3:f1+m7+c1',
    [
      { titre: { fr: 'On écarte ce qui n’est pas « hope ».',
                 en: 'Everything that is not "hope" is set aside.' },
        calcul: 'hope-hope-hope.fr → hope · hope · hope' },
      { titre: { fr: 'On traduit chaque mot en français.',
                 en: 'Each word is translated into French.' },
        calcul: 'hope → espoir' },
      { titre: { fr: 'On compte les lettres du mot français.',
                 en: 'The letters of the French word are counted.' },
        calcul: 'e·s·p·o·i·r = 6' },
      { titre: { fr: 'Le motif se répète trois fois.',
                 en: 'The pattern repeats three times.' },
        calcul: '6 · 6 · 6' },
    ]),
  V(2,
    { fr: 'Le compte des lettres et des voyelles', en: 'Counting letters and vowels' },
    { fr: 'On comptabilise le nombre total de lettres, puis on ajoute le nombre de voyelles.',
      en: 'The total number of letters is counted, then the number of vowels is added.' },
    { fr: '4 lettres + 2 voyelles = 6, ×3', en: '4 letters + 2 vowels = 6, ×3' },
    '×3:f1+n1+n3+c1',
    [
      { titre: { fr: 'On isole les trois occurrences.', en: 'The three occurrences are isolated.' },
        calcul: 'hope · hope · hope' },
      { titre: { fr: 'On compte les lettres.', en: 'The letters are counted.' },
        calcul: 'H·O·P·E = 4' },
      { titre: { fr: 'On compte les voyelles.', en: 'The vowels are counted.' },
        calcul: 'O, E = 2' },
      { titre: { fr: 'On additionne.', en: 'They are added up.' },
        calcul: '4 + 2 = 6' },
      { titre: { fr: 'Trois fois le même compte.', en: 'The same count, three times over.' },
        calcul: '6 · 6 · 6' },
    ]),
  V(3,
    { fr: 'Le compte des lettres et des consonnes', en: 'Counting letters and consonants' },
    { fr: 'On comptabilise le nombre total de lettres, puis on ajoute le nombre de consonnes.',
      en: 'The total number of letters is counted, then the number of consonants is added.' },
    { fr: '4 lettres + 2 consonnes = 6, ×3', en: '4 letters + 2 consonants = 6, ×3' },
    '×3:f1+n1+n4+c1',
    [
      { titre: { fr: 'On isole les trois occurrences.', en: 'The three occurrences are isolated.' },
        calcul: 'hope · hope · hope' },
      { titre: { fr: 'On compte les lettres.', en: 'The letters are counted.' },
        calcul: 'H·O·P·E = 4' },
      { titre: { fr: 'On compte les consonnes.', en: 'The consonants are counted.' },
        calcul: 'H, P = 2' },
      { titre: { fr: 'On additionne.', en: 'They are added up.' },
        calcul: '4 + 2 = 6' },
      { titre: { fr: 'Trois fois le même compte.', en: 'The same count, three times over.' },
        calcul: '6 · 6 · 6' },
    ]),
  V(4,
    { fr: 'La somme des trois répétitions en gématrie simple',
      en: 'The sum of the three repetitions in simple gematria' },
    { fr: 'A = 1, B = 2 … Z = 26, puis réduction théosophique.',
      en: 'A = 1, B = 2 … Z = 26, then theosophical reduction.' },
    '8+15+16+5 = 44 → 8 ; 8+8+8 = 24 → 6',
    'm1+c1+p1',
    [
      { titre: { fr: 'Chaque lettre vaut son rang dans l’alphabet.',
                 en: 'Each letter is worth its rank in the alphabet.' },
        calcul: 'H=8 O=15 P=16 E=5' },
      { titre: { fr: 'On additionne.', en: 'They are added up.' },
        calcul: '8 + 15 + 16 + 5 = 44' },
      { titre: { fr: 'On réduit.', en: 'The result is reduced.' },
        calcul: '4 + 4 = 8' },
      { titre: { fr: 'Les trois mots.', en: 'The three words.' },
        calcul: '8 + 8 + 8 = 24' },
      { titre: { fr: 'On réduit encore.', en: 'It is reduced once more.' },
        calcul: '2 + 4 = 6' },
      { titre: { fr: 'Les deux tirets du 6 donnent les deux autres.',
                 en: 'The two dashes of the 6 yield the other two.' },
        calcul: '6 · 6 · 6' },
    ]),
  V(5,
    { fr: 'L’affichage à sept segments', en: 'The seven-segment display' },
    { fr: 'On compte les traits géométriques continus, segments alignés fusionnés.',
      en: 'Continuous geometric strokes are counted, collinear segments merged.' },
    { fr: '3+4+4+4 = 15 → 6, ×3', en: '3+4+4+4 = 15 → 6, ×3' },
    '×3:f1+m5+c1+p1',
    [
      { titre: { fr: 'On écrit HOPE en capitales sur un afficheur.',
                 en: 'HOPE is written in capitals on a display.' },
        calcul: 'H O P E' },
      { titre: { fr: 'On fusionne les segments colinéaires.',
                 en: 'Collinear segments are merged.' },
        calcul: 'H=3 O=4 P=4 E=4' },
      { titre: { fr: 'On additionne.', en: 'They are added up.' },
        calcul: '3 + 4 + 4 + 4 = 15' },
      { titre: { fr: 'On réduit.', en: 'The result is reduced.' },
        calcul: '1 + 5 = 6' },
      { titre: { fr: 'Trois fois le même compte.', en: 'The same count, three times over.' },
        calcul: '6 · 6 · 6' },
    ]),
  V(6,
    { fr: 'L’astuce AZERTY et le retournement du 9',
      en: 'The AZERTY trick and the flipping of the 9' },
    { fr: 'On utilise le clavier français, puis une double pirouette arithmétique.',
      en: 'The French keyboard is used, then a double arithmetical pirouette.' },
    { fr: 'les deux tirets sont sur la touche du 6 ; 36 → 9 → 6',
      en: 'both dashes sit on the 6 key; 36 → 9 → 6' },
    'm3+c1+p1+p9',
    [
      { titre: { fr: 'On isole les séparateurs.', en: 'The separators are isolated.' },
        calcul: 'hope - hope - hope' },
      { titre: { fr: 'On relève leur position sur le clavier.',
                 en: 'Their position on the keyboard is read off.' },
        calcul: { fr: '« - » partage la touche du 6', en: '"-" shares the 6 key' } },
      { titre: { fr: 'Les deux tirets valent donc 6 et 6.',
                 en: 'The two dashes are therefore worth 6 and 6.' },
        calcul: '6 · 6' },
      { titre: { fr: 'On somme les lettres de chaque mot.',
                 en: 'The letters of each word are summed.' },
        calcul: '8 + 15 + 16 + 5 = 44 → 8' },
      { titre: { fr: 'On additionne mots et tirets.',
                 en: 'Words and dashes are added together.' },
        calcul: '8 + 6 + 8 + 6 + 8 = 36' },
      { titre: { fr: 'On réduit.', en: 'The result is reduced.' },
        calcul: '3 + 6 = 9' },
      { titre: { fr: 'On retourne le 9.', en: 'The 9 is turned upside down.' },
        calcul: '9 → 6' },
    ]),
  V(7,
    { fr: 'La soustraction', en: 'The subtraction' },
    { fr: 'Les mots sont séparés par des tirets : ce sont donc des soustractions.',
      en: 'The words are separated by dashes: they are therefore subtractions.' },
    '8−15−16−5 = −28 → 8 − 2 = 6',
    'm1+c2+p1',
    [
      { titre: { fr: 'Les tirets deviennent des opérateurs.',
                 en: 'The dashes become operators.' },
        calcul: 'H − O − P − E' },
      { titre: { fr: 'On calcule.', en: 'The sum is computed.' },
        calcul: '8 − 15 − 16 − 5 = −28' },
      { titre: { fr: 'On sépare les chiffres.', en: 'The digits are split apart.' },
        calcul: '−28 → 2 et 8' },
      { titre: { fr: 'Le signe reporte la soustraction.',
                 en: 'The sign carries the subtraction over.' },
        calcul: '8 − 2 = 6' },
    ]),
];

export const FRAGMENTS_ESSAI = [
  { texte: 'hope', methode: { fr: 'lettres + voyelles', en: 'letters + vowels' },
    valeur: 6, programme: 'n1+n3+c1' },
  { texte: 'hope', methode: { fr: 'lettres + consonnes', en: 'letters + consonants' },
    valeur: 6, programme: 'n1+n4+c1' },
  { texte: '-', methode: { fr: 'touche du 6 en AZERTY', en: 'the 6 key on AZERTY' },
    valeur: 6, programme: 'm3' },
  { texte: 'hope', methode: { fr: 'sept segments fusionnés', en: 'seven segments merged' },
    valeur: 6, programme: 'm5+c1+p1' },
  { texte: 'fr', methode: { fr: 'gématrie simple puis racine numérique', en: 'Simple gematria then digital root' },
    valeur: 6, programme: 'm1+c1+p1' },
  { texte: 'espoir', methode: { fr: 'compte des lettres', en: 'letter count' },
    valeur: 6, programme: 'm7+n1' },
];

/** Fabrique un Scenario minimal (CONTRACTS §3) à partir d'une approche d'essai. */
export function scenarioDEssai(approche, saisie) {
  return {
    version: 1,
    input: saisie,
    method: { id: approche.rang, label: approche.titre, rule: approche.regle },
    result: approche.resultat,
    tokens: [],
    steps: approche.etapes.map((etape, i) => ({
      id: `s${i}`,
      title: etape.titre,
      caption: etape.calcul,
    })),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   Lecteur de secours — même API que `src/visuel/player.js` (CONTRACTS §3.3),
   mais sans aucune animation : il ne fait qu'avancer dans les charnières.
   Il existe pour que la barre de transport, la jauge, la région live et Le
   Registre restent opérants même quand la scène ne peut pas être tracée.
   ══════════════════════════════════════════════════════════════════════════ */

const EPS = 4;

export function creerLecteurDeSecours(scenario, options = {}) {
  const steps = scenario.steps || [];
  const rm = options.reducedMotion;
  const reduit = rm === 'force' || rm === true
    || ((rm === 'auto' || rm === undefined) && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const duree = reduit ? 2500 : 1800;      // 1,4 s + 0,4 s de charnière

  const bounds = [0];
  for (let i = 0; i < steps.length; i++) bounds.push(bounds[i] + duree);
  const total = bounds[bounds.length - 1] || 0;

  let t = 0, enLecture = false, boucle = 0, dernierTic = 0, dernierPas = -1, detruit = false;
  const auditeurs = { change: new Set(), stepenter: new Set(), end: new Set() };

  const emettre = (nom, a) => { for (const f of auditeurs[nom] || []) f(a); };

  function indiceEtape(temps) {
    if (steps.length === 0) return 0;
    for (let i = steps.length - 1; i >= 0; i--) if (temps >= bounds[i] - EPS) return i;
    return 0;
  }

  function poser(nouveau, { silencieux = false } = {}) {
    t = Math.max(0, Math.min(total, nouveau));
    const i = indiceEtape(t);
    if (!silencieux) emettre('change', lecteur);
    if (i !== dernierPas) { dernierPas = i; emettre('stepenter', { stepIndex: i, step: steps[i] || null }); }
  }

  function tic(horodatage) {
    if (!enLecture || detruit) return;
    const delta = dernierTic ? horodatage - dernierTic : 0;
    dernierTic = horodatage;
    poser(t + delta * (options.speed || 1));
    if (t >= total - EPS) { enLecture = false; emettre('change', lecteur); emettre('end', { t: total }); return; }
    boucle = requestAnimationFrame(tic);
  }

  const lecteur = {
    get total() { return total; },
    get bounds() { return bounds.slice(); },
    get steps() { return steps; },
    get currentTime() { return t; },
    get stepIndex() { return indiceEtape(t); },
    get playing() { return enLecture; },
    get atStart() { return t <= EPS; },
    get atEnd() { return t >= total - EPS; },
    get atHinge() { return bounds.some((b) => Math.abs(b - t) <= EPS); },
    get degrade() { return true; },

    play() {
      if (enLecture || detruit) return;
      if (t >= total - EPS) t = 0;
      enLecture = true; dernierTic = 0;
      boucle = requestAnimationFrame(tic);
      emettre('change', lecteur);
    },
    pause() {
      if (!enLecture) return;
      enLecture = false; cancelAnimationFrame(boucle);
      emettre('change', lecteur);
    },
    seek(ms) { poser(ms); },
    seekToStep(i) { poser(bounds[Math.max(0, Math.min(bounds.length - 1, i))]); },
    toStart() { poser(0); },
    toEnd() { lecteur.pause(); poser(total); emettre('end', { t: total }); },
    next() {
      const b = bounds.find((v) => v > t + EPS);
      poser(b === undefined ? total : b);
      if (t >= total - EPS) emettre('end', { t: total });
    },
    prev() {
      const candidats = bounds.filter((v) => v < t - EPS);
      poser(candidats.length ? candidats[candidats.length - 1] : 0);
    },
    rebuild() { /* rien à reconstruire : aucune animation */ },
    destroy() { detruit = true; cancelAnimationFrame(boucle); for (const s of Object.values(auditeurs)) s.clear(); },
    on(nom, f) { (auditeurs[nom] || (auditeurs[nom] = new Set())).add(f); return () => auditeurs[nom].delete(f); },
  };
  return lecteur;
}
