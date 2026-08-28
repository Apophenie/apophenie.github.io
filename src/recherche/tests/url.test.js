import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lire, ecrire, ecrireApproche, descripteursDe, canoniser, autreRegistre, BANDEAUX, RE_CODE,
} from '../url.js';
import { encoderTexte, LIMITE_SAISIE } from '../base58.js';
import { catalogue } from './_catalogue.js';

const B58_HOPE = encoderTexte('hope');                       // 3fq9KJ
const B58_URL = encoderTexte('https://hope-hope-hope.fr/');

test('url — grammaire canonique : une seule voie, saisie entière', () => {
  const r = lire(`#fp+tca+ma1+cs+prn#${B58_HOPE}`);
  assert.equal(r.forme, 'canonique');
  assert.equal(r.saisie, 'hope');
  assert.equal(r.fragments.length, 1);
  assert.deepEqual(r.fragments[0].codes, ['fp', 'tca', 'ma1', 'cs', 'prn']);
  assert.equal(r.fragments[0].portee, null);
  assert.equal(r.bandeau, null);
});

test('url — `+` sépare les opérations, `,` sépare les fragments', () => {
  const r = lire(`#0.1:ma1+cs+prn,1.1:nv+prn,2.1:mch+cs#${B58_URL}`);
  assert.equal(r.forme, 'canonique');
  assert.equal(r.fragments.length, 3);
  assert.deepEqual(r.fragments[0], { portee: { offset: 0, longueur: 1 }, resonance: null, codes: ['ma1', 'cs', 'prn'] });
  assert.deepEqual(r.fragments[1].codes, ['nv', 'prn']);
  assert.deepEqual(r.fragments[2].portee, { offset: 2, longueur: 1 });
});

test('url — abréviation de résonance ×3, et ses formes tolérées', () => {
  for (const signe of ['×', 'x', 'X', '*']) {
    const r = lire(`#${signe}3:ma1+cs+prn#${B58_URL}`);
    assert.equal(r.forme, 'canonique', `signe ${signe}`);
    assert.equal(r.fragments[0].resonance, 3);
    assert.deepEqual(r.fragments[0].codes, ['ma1', 'cs', 'prn']);
  }
  // Fragment percent-encodé par une messagerie : doit rester lisible.
  const encode = `#${encodeURIComponent('×3:ma1+cs+prn')}#${B58_URL}`;
  assert.equal(lire(encode).fragments[0].resonance, 3);
});

test('url — page de résultats `##b58` (forme du README)', () => {
  const r = lire(`##${B58_HOPE}`);
  assert.equal(r.forme, 'resultats');
  assert.equal(r.saisie, 'hope');
  assert.equal(r.fragments, null);
});

test('url — hash vide : page d’accueil', () => {
  assert.equal(lire('').forme, 'resultats');
  assert.equal(lire('#').forme, 'resultats');
});

test('url — forme héritée `#3+7+2#` : rangs + bandeau « recalculée »', () => {
  const r = lire(`#3+7+2#${B58_HOPE}`);
  assert.equal(r.forme, 'heritee');
  assert.deepEqual(r.rangs, [3, 7, 2]);
  assert.equal(r.bandeau, BANDEAUX.recalculee);
  const seul = lire(`#3#${B58_HOPE}`);
  assert.equal(seul.forme, 'heritee');
  assert.deepEqual(seul.rangs, [3]);
});

test('url — un lien ne renvoie JAMAIS silencieusement ailleurs', () => {
  const cas = [
    [`#zz9#${B58_HOPE}`, 'code hors grammaire'],
    [`#ma1+#${B58_HOPE}`, 'programme incomplet'],
    // ⚠️ `#ma1#pas du base58` a QUITTÉ cette liste : ce n'est plus un lien
    // illisible mais un programme joué sur la saisie « pas du base58 » (voir
    // la section « la saisie en clair », plus bas). Ce qui reste invalide,
    // c'est un lien qui ne porte AUCUNE saisie — ni base58, ni texte.
    ['#ma1#', 'saisie vide'],
    ['#ma1#   ', 'saisie faite de blancs'],
    [`#ma1#${B58_HOPE}#trop`, 'trois segments'],
    [`#0.:ma1#${B58_HOPE}`, 'portée incomplète'],
  ];
  for (const [hash, quoi] of cas) {
    const r = lire(hash);
    assert.equal(r.forme, 'invalide', quoi);
    assert.ok(r.bandeau, `${quoi} doit afficher un bandeau`);
  }
});

test('url — code inconnu du catalogue : bandeau explicite, pas de repli muet', () => {
  const r = lire(`#ma1+czz9#${B58_HOPE}`, { catalogue });
  assert.equal(r.forme, 'invalide');
  assert.equal(r.bandeau, BANDEAUX.codeInconnu);
  assert.match(r.raison, /czz9/);
  // Le même lien sans validation de catalogue reste syntaxiquement canonique.
  assert.equal(lire(`#ma1+czz9#${B58_HOPE}`).forme, 'canonique');
});

test('url — écriture canonique : aller-retour exact', () => {
  const frags = [
    { portee: { offset: 0, longueur: 3 }, resonance: null, codes: ['fp', 'ma1', 'cs'] },
    { portee: null, resonance: null, codes: ['nv'] },
  ];
  const s = ecrire({ saisie: 'hope', fragments: frags });
  // Le registre est TOUJOURS écrit, même quand il vaut le défaut : plus jamais
  // de lien ambigu (`url.js`, « écriture canonique »).
  assert.equal(s, `#so!0.3:fp+ma1+cs,nv#${B58_HOPE}`);
  const r = lire(s);
  assert.equal(r.saisie, 'hope');
  assert.deepEqual(r.fragments, frags);
  assert.equal(r.registre, 'sobre');
  assert.equal(r.registreEcrit, true);
});

test('url — écriture sans approche = page de résultats', () => {
  assert.equal(ecrire({ saisie: 'hope' }), `##${B58_HOPE}`);
  assert.equal(ecrire({ saisie: 'hope', fragments: [] }), `##${B58_HOPE}`);
});

test('url — la forme héritée n’est JAMAIS produite en écriture', () => {
  const s = ecrireApproche([{ portee: null, resonance: null, codes: ['ma1'] }]);
  assert.ok(!/^\d+(\+\d+)*$/.test(s), `« ${s} » ne doit pas ressembler à des rangs`);
});

test('url — descripteursDe applique l’abréviation de résonance', () => {
  const op = (code) => ({ code });
  const chemin = { ops: [op('ma1'), op('cs'), op('prn')] };
  const frag = (offset) => ({ offset, longueur: 4, tokenDebut: offset, tokenLong: 1, famille: 'repetition' });
  const approche = {
    resonance: true,
    parts: [{ chemin, fragment: frag(8) }, { chemin, fragment: frag(13) }, { chemin, fragment: frag(18) }],
  };
  assert.deepEqual(descripteursDe(approche), [{ portee: null, resonance: 3, codes: ['ma1', 'cs', 'prn'] }]);
  assert.equal(ecrireApproche(descripteursDe(approche)), '×3:ma1+cs+prn');
});

test('url — canoniser() réécrit la barre d’adresse par replaceState', () => {
  const appels = [];
  const faux = {
    location: { pathname: '/numherololgeek/', search: '', hash: '#3+7+2#' + B58_HOPE },
    history: { replaceState: (...a) => appels.push(a) },
  };
  const frag = canoniser({ saisie: 'hope', fragments: [{ portee: null, resonance: null, codes: ['nd'] }] }, faux);
  assert.equal(frag, `#so!nd#${B58_HOPE}`);
  assert.equal(appels.length, 1);
  assert.equal(appels[0][2], `/numherololgeek/#so!nd#${B58_HOPE}`);
  // Idempotent : si le hash est déjà canonique, on n’empile rien.
  faux.location.hash = frag;
  canoniser({ saisie: 'hope', fragments: [{ portee: null, resonance: null, codes: ['nd'] }] }, faux);
  assert.equal(appels.length, 1);
});

/* ══════════════════ le REGISTRE de mise en scène — sobre / scénique ══════ */

test('registre — les deux marqueurs se lisent, et ne changent QUE la mise en scène', () => {
  for (const [hash, attendu] of [
    [`#so!ma1+cs+prn#${B58_HOPE}`, 'sobre'],
    [`#sce!ma1+cs+prn#${B58_HOPE}`, 'scenique'],
  ]) {
    const r = lire(hash);
    assert.equal(r.forme, 'canonique', hash);
    assert.equal(r.registre, attendu);
    assert.equal(r.registreEcrit, true);
    // Le programme est le MÊME de part et d'autre : c'est toute la promesse
    // du registre — une seule voie, deux mises en scène.
    assert.deepEqual(r.fragments, [{ portee: null, resonance: null, codes: ['ma1', 'cs', 'prn'] }]);
  }
});

test('★ registre — l’absence de marqueur vaut « SOBRE » : la mise en scène s’opte', () => {
  // ★ Renversement assumé, justifié en tête de `url.js`. Le défaut a valu
  // « scénique » tant qu'il fallait protéger des liens déjà partagés ; l'auteur
  // a confirmé qu'aucun n'a été diffusé. Reste l'argument de fond : un lien nu
  // doit rendre la version CRÉDIBLE, et le spectacle doit être demandé.
  const r = lire(`#0.1:tca+m14+m36,2.1:fr13+tca+m14+m36#2HuP1G8mNg3sJWhqR`);
  assert.equal(r.forme, 'canonique');
  assert.equal(r.registre, 'sobre');
  assert.equal(r.registreEcrit, false, 'le lien ne le portait pas : on le SAIT');

  // Et les deux puces-raccourcis de la page d'accueil (`src/i18n/fr.js`,
  // `accueil.exemples`) restent lisibles telles quelles.
  for (const hash of [
    '#0.1:tca+m14,1.1:tca+mtc+cs,2.1:tca+m14,3.1:tca+mtc+cs,4.1:tca+m14,6.1:tca+m7+cs#yvQYkzhNVYJT8wM8jhvJxSM',
    '#0.1:tca+mch+cs+prn,3.1:fc+nl,5.1:tca+m7+cs#3A8evQZovd7BUyRUF65ToBwrHvW25EUn',
  ]) {
    const l = lire(hash);
    assert.equal(l.forme, 'canonique', hash);
    assert.equal(l.registre, 'sobre');
  }
});

/**
 * ★ RENVERSEMENT ASSUMÉ : un marqueur seul ne s'annonce plus, il CHERCHE.
 *
 * Ce test disait l'inverse, et son argument était bon tant qu'il tenait :
 * « un marqueur de mise en scène sans programme à mettre en scène est un lien
 * tronqué ». Ce qui a changé n'est pas l'argument mais ce qu'on sait en faire —
 * demander une mise en scène, c'est demander une DÉMONSTRATION, et nous savons
 * désormais laquelle montrer quand le lien ne la nomme pas : la première du
 * classement, exactement comme le bouton « Révéler ». Un lien qui a un sens
 * utile vaut mieux qu'un bandeau d'erreur, et §4.3 est respecté — on ne renvoie
 * pas ailleurs en silence, on fait ce que le lien demande.
 */
test('★ registre — un marqueur seul vaut « cherche, puis montre la 1ʳᵉ voie »', () => {
  const r = lire(`#so!#${B58_HOPE}`);
  assert.equal(r.forme, 'premiere');
  assert.equal(r.saisie, 'hope');
  assert.equal(r.registre, 'sobre');
  assert.equal(r.registreEcrit, true);
  assert.equal(r.bandeau, null, 'rien à annoncer : le lien est honoré');
  assert.equal(lire(`#sce!#${B58_HOPE}`).registre, 'scenique');
});

test('registre — la page de résultats n’en porte pas : rien à mettre en scène', () => {
  assert.equal(ecrire({ saisie: 'hope' }), `##${B58_HOPE}`);
  assert.equal(lire(`##${B58_HOPE}`).registre, null);
});

test('registre — aller-retour exact dans les deux registres', () => {
  const frags = [{ portee: { offset: 0, longueur: 1 }, resonance: null, codes: ['tca', 'm14', 'm36'] }];
  for (const registre of ['sobre', 'scenique']) {
    const s = ecrire({ saisie: 'hope', fragments: frags, registre });
    const r = lire(s);
    assert.equal(r.registre, registre);
    assert.deepEqual(r.fragments, frags);
    assert.equal(ecrire({ saisie: 'hope', fragments: r.fragments, registre: r.registre }), s);
  }
});

test('registre — `autreRegistre` est une involution : deux boutons, jamais trois', () => {
  assert.equal(autreRegistre('sobre'), 'scenique');
  assert.equal(autreRegistre('scenique'), 'sobre');
  assert.equal(autreRegistre(autreRegistre('sobre')), 'sobre');
  // Une valeur inconnue mène au sobre : le bouton proposé est alors « l'autre
  // que le défaut », ce qui reste vrai.
  assert.equal(autreRegistre(undefined), 'sobre');
});

test('registre — un marqueur inventé n’est pas un registre, c’est un fragment illisible', () => {
  const r = lire(`#tapageur!ma1#${B58_HOPE}`);
  assert.equal(r.forme, 'invalide');
  assert.ok(r.bandeau, 'jamais de repli muet');
});

test('url — accents : la saisie survit à l’aller-retour dans l’URL', () => {
  const saisie = 'Éléonore à Nîmes — 100 % vrai !';
  const s = ecrire({ saisie, fragments: [{ portee: null, resonance: null, codes: ['nl'] }] });
  assert.equal(lire(s).saisie, saisie);
});

/**
 * ★ La forme longue est encore LUE, jamais écrite.
 *
 * « Dans l'URL, remplace "sobre" par "so" et "scenique" par "sce" » (l'auteur),
 * avec sa raison : « l'URL reste essentiellement cryptique et ça participe à
 * l'effet de surprise ». La forme longue n'aura vécu qu'une version — la 1.2.0,
 * publiée quelques heures —, mais les liens de cette fenêtre-là existent. Les
 * relire coûte deux alternatives ; les casser coûterait un lien mort.
 */
test('★ registre — la forme longue se relit, la forme brève s’écrit', () => {
  for (const [long, bref, attendu] of [['sobre', 'so', 'sobre'], ['scenique', 'sce', 'scenique']]) {
    assert.equal(lire(`#${long}!ma1+cs+prn#${B58_HOPE}`).registre, attendu,
      `« ${long}! » n’est plus compris : les liens de la 1.2.0 sont morts`);
    assert.equal(lire(`#${bref}!ma1+cs+prn#${B58_HOPE}`).registre, attendu);
    // Et c'est la forme brève qui sort, quelle que soit celle qui est entrée.
    const ecrit = ecrire({ saisie: 'hope', fragments: [{ codes: ['ma1'] }], registre: attendu });
    assert.ok(ecrit.startsWith(`#${bref}!`), `écrit « ${ecrit} », attendu le préfixe « ${bref}! »`);
    assert.doesNotMatch(ecrit, new RegExp(`^#${long}!`), 'la forme longue est encore écrite');
  }
});

/**
 * ★ **LA GRAMMAIRE DES CODES EST ÉCRITE TROIS FOIS, ET LES TROIS DOIVENT DIRE
 * LA MÊME CHOSE.**
 *
 * `moteur/transformations/commun.js` la tient pour le catalogue, `url.js` pour
 * la lecture d'un lien, `bfs.js` pour la validation d'un catalogue injecté. La
 * recopie n'est pas de la négligence : `src/recherche` ne connaît le catalogue
 * que par injection, et c'est précisément ce découplage qui permet de le
 * tester sur un catalogue de fantaisie. Le prix est donc payé ici — par un
 * test qui échoue au premier signe de divergence — plutôt que par une
 * dépendance qui casserait l'injection.
 *
 * ⚠ Ce qui a rendu ce test nécessaire : le renommage en codes parlants a
 * introduit la majuscule de variante (`m14F`, `m7F`). Les trois écritures
 * disaient `[0-9a-z]+` ; deux d'entre elles auraient pu être oubliées, et le
 * symptôme n'aurait été ni une exception ni un test rouge — juste un lien
 * parfaitement valide déclaré « hors grammaire », donc un repli muet sur la
 * page de résultats. Exactement ce que CONTRACTS §4.3 interdit.
 */
test('★ grammaire des codes — les trois écritures sont identiques (CONTRACTS §4.1)', async () => {
  const { RE_CODE: DU_MOTEUR } = await import('../../moteur/transformations/commun.js');
  assert.equal(RE_CODE.source, DU_MOTEUR.source, 'url.js a dérivé de commun.js');
  assert.equal(RE_CODE.flags, DU_MOTEUR.flags);
  // `bfs.js` garde la sienne privée : on l'éprouve par son effet, sur un
  // catalogue d'un seul opérateur dont le code porte une majuscule de variante.
  const { validerCatalogue } = await import('../bfs.js');
  const gabarit = catalogue.operateurs ? catalogue.operateurs[0] : catalogue[0];
  const pbs = validerCatalogue([{ ...gabarit, id: 'm.variante', code: 'm14F' }]);
  assert.deepEqual(pbs.filter((p) => /§4\.1/.test(p)), [],
    'bfs.js refuse une majuscule de variante que le moteur accepte');
  // Et les trois refusent la même chose.
  for (const faux of ['m', 'M14', 'm14FF', 'm14Fa', 'z1', '14m']) {
    assert.doesNotMatch(faux, RE_CODE, `« ${faux} » ne devrait pas être un code`);
    assert.doesNotMatch(faux, DU_MOTEUR, `« ${faux} » ne devrait pas être un code`);
  }
});

/* ══════════ LA SAISIE EN CLAIR — la tolérance est en LECTURE seule ═══════ */

/**
 * ★ « Si après le 2nd # une séquence non b58 est présente, plutôt que
 * d'échouer, considère la chaîne comme étant la saisie brute » (l'auteur).
 *
 * Les quatre formes sont recopiées de sa demande, avec ses exemples : ce test
 * est le contrat, pas une illustration. Ce qui les sépare est le NOMBRE DE `#`
 * et la présence d'un programme — jamais la nature de la saisie, qui se lit de
 * la même façon dans les quatre.
 */
test('★ saisie en clair — les quatre formes demandées par l’auteur', () => {
  // 1. « #Donald Trump » → recherche, puis animation de la 1ʳᵉ voie.
  const une = lire('#Donald Trump');
  assert.equal(une.forme, 'premiere');
  assert.equal(une.saisie, 'Donald Trump');
  assert.equal(une.saisieBrute, true);
  assert.equal(une.registre, 'sobre', 'le geste de « Révéler », donc le défaut');
  assert.equal(une.cible.texte, '666');

  // 2. « ##Donald Trump » → l'énumération des voies.
  const deux = lire('##Donald Trump');
  assert.equal(deux.forme, 'resultats');
  assert.equal(deux.saisie, 'Donald Trump');

  // 3. « #c111!sce!#Donald Trump » → recherche visant 111, puis animation.
  const trois = lire('#c111!sce!#Donald Trump');
  assert.equal(trois.forme, 'premiere');
  assert.equal(trois.saisie, 'Donald Trump');
  assert.equal(trois.cible.texte, '111');
  // ⚠️ Et le registre RETOMBE sur sobre, parce que 111 n'a pas d'emblème
  // dessiné — c'est la règle de repli qui existait déjà, pas une nouveauté.
  assert.equal(trois.registre, 'sobre');
  assert.equal(trois.registreDemande, 'scenique');
  // L'ordre des marqueurs reste indifférent, comme partout ailleurs.
  assert.equal(lire('#sce!c111!#Donald Trump').forme, 'premiere');

  // 4. « #so!tca+m36#Donald Trump » → aucune recherche, ce programme-là.
  const quatre = lire('#so!tca+m36#Donald Trump');
  assert.equal(quatre.forme, 'canonique');
  assert.equal(quatre.saisie, 'Donald Trump');
  assert.deepEqual(quatre.fragments, [{ portee: null, resonance: null, codes: ['tca', 'm36'] }]);
  // Sans marqueur non plus : c'est la saisie qui est tolérée, pas la grammaire.
  assert.equal(lire('#0.1:tca+m36,1.1:tca+m36#Donald Trump').fragments.length, 2);
});

/**
 * ★ LA DÉSAMBIGUÏSATION, et les mots qu'elle rate — mesurés, pas devinés.
 *
 * L'alphabet base58 est fait de lettres et de chiffres : 39 % des mots de
 * `/usr/share/dict/french` n'emploient que ses 58 signes, « Macron » compris. Ce
 * qui tranche n'est donc pas l'alphabet mais le DÉCODAGE, et il reste 435 mots
 * sur 346 244 qui passent quand même — la mesure complète est en tête de
 * `url.js`. Ce test fixe les deux bords de cette frontière.
 */
test('★ saisie en clair — le base58 gagne, et les mots qu’il gagne à tort', () => {
  // Le lien que le site PRODUIT se relit comme du base58, toujours.
  assert.equal(lire(`##${encoderTexte('Macron')}`).saisie, 'Macron');
  assert.equal(lire(`##${encoderTexte('Macron')}`).saisieBrute, false);

  // Et « Macron » tapé en clair reste « Macron », bien qu'il n'emploie que des
  // signes de l'alphabet : les octets qu'il désigne ne font pas de l'UTF-8.
  const clair = lire('##Macron');
  assert.equal(clair.saisie, 'Macron');
  assert.equal(clair.saisieBrute, true);

  // ⚠️ L'ANGLE MORT, assumé, mesuré et BRUYANT. Ces trois-là décodent en texte
  // parfaitement valide : ils restent donc lus comme des jetons. Le visiteur le
  // voit du premier coup d'œil — la page cite en titre la saisie comprise —, et
  // c'est ce qui rend le reliquat tenable : §4.3 interdit les replis MUETS.
  for (const [mot, decode] of [['a', '!'], ['aide', 'db9'], ['abattent', 'Cwd!9a']]) {
    const r = lire(`##${mot}`);
    assert.equal(r.saisie, decode, `« ${mot} » n’est plus lu comme du base58`);
    assert.equal(r.saisieBrute, false);
  }

  // La troisième condition — ni caractère de commande, ni chaîne de blancs —
  // rattrape tout le reste : « Z » décode en une espace, « cat » en U+0001 ә.
  for (const mot of ['Z', 'cat', 'bug', 'amour', 'num', '12345', 'chat', 'Wikipedia']) {
    const r = lire(`##${mot}`);
    assert.equal(r.saisie, mot, `« ${mot} » a été pris pour du base58`);
    assert.equal(r.saisieBrute, true);
  }

  // ★ Et la borne qui interdit une quatrième condition : « 666 » s'encode en
  //   quatre signes. Un seuil de longueur qui rattraperait « aide » tuerait ce
  //   lien-là, qui est légitime — le site l'écrit.
  assert.equal(encoderTexte('666'), 'KD8Z');
  assert.equal(lire('##KD8Z').saisie, '666');
});

test('saisie en clair — l’espace passe littéral ou en %20, et le % survit', () => {
  assert.equal(lire('#Donald%20Trump').saisie, 'Donald Trump');
  assert.equal(lire('##Donald%20Trump').saisie, 'Donald Trump');
  assert.equal(lire('#so!tca+m36#Donald%20Trump').saisie, 'Donald Trump');
  // Un `%` que personne n'a songé à échapper ne doit pas tuer le lien.
  assert.equal(lire('##100% vrai').saisie, '100% vrai');
  // Les blancs de bord sont coupés, comme le fait le champ d'accueil.
  assert.equal(lire('##  Donald Trump  ').saisie, 'Donald Trump');
  // Un `#` DANS la saisie survit s'il est échappé : c'est ce qu'apporte le
  // décodage par segment (`depourcenter`), et un mot-dièse est une saisie
  // plausible sur ce site-là.
  assert.equal(lire('##%23JeSuis666').saisie, '#JeSuis666');
});

test('saisie en clair — le plafond de saisie vaut aussi pour le texte brut', () => {
  const r = lire(`##${'a'.repeat(LIMITE_SAISIE + 1)}`);
  assert.equal(r.forme, 'invalide');
  assert.equal(r.bandeau, BANDEAUX.saisieTropLongue);
  assert.equal(lire(`##${'a'.repeat(LIMITE_SAISIE)}`).forme, 'resultats', 'la borne est inclusive');
});

/**
 * ★ L'ÉCRITURE NE BOUGE PAS D'UN SIGNE, et c'est tout l'intérêt.
 *
 * « La version b58 est bien sûr toujours supportée et à conserver par défaut
 * quand on passe par l'interface du site » (l'auteur). La tolérance est en
 * lecture ; `canoniser()` fait le reste, et un lien tapé à la main se change
 * tout seul en lien partageable dès qu'on l'ouvre — exactement le mécanisme qui
 * abrège `sobre!` en `so!`.
 */
test('★ saisie en clair — l’écriture reste en base58, la barre d’adresse se corrige', () => {
  const frags = [{ portee: null, resonance: null, codes: ['tca', 'm36'] }];
  assert.equal(ecrire({ saisie: 'Macron', fragments: frags }), `#so!tca+m36#${encoderTexte('Macron')}`);
  assert.equal(ecrire({ saisie: 'Donald Trump' }), `##${encoderTexte('Donald Trump')}`);

  const appels = [];
  const faux = {
    location: { pathname: '/numherololgeek/', search: '', hash: '#so!tca+m36#Macron' },
    history: { replaceState: (...a) => appels.push(a) },
  };
  const lu = lire(faux.location.hash);
  canoniser({ saisie: lu.saisie, fragments: lu.fragments, registre: lu.registre }, faux);
  assert.equal(appels.length, 1, 'un lien tapé à la main n’est pas laissé en l’état');
  assert.equal(appels[0][2], `/numherololgeek/#so!tca+m36#${encoderTexte('Macron')}`);
});

/**
 * NON-RÉGRESSION. Les liens que le site a produits doivent se relire au signe
 * près, saisie comprise : c'est la seule chose que la tolérance pouvait casser.
 */
test('saisie en clair — les liens base58 existants se relisent à l’identique', () => {
  const temoins = [
    'Macron', 'Donald Trump', 'hope', 'https://hope-hope-hope.fr/', '666',
    'Éléonore à Nîmes — 100 % vrai !', 'jean-michel', 'Wikipédia', 'a', 'Z',
  ];
  const frags = [{ portee: null, resonance: null, codes: ['tca', 'm36'] }];
  for (const saisie of temoins) {
    for (const demonstration of [{ saisie }, { saisie, fragments: frags }]) {
      const lien = ecrire(demonstration);
      const r = lire(lien);
      assert.equal(r.saisie, saisie, `« ${saisie} » ne se relit pas : ${lien}`);
      assert.equal(r.saisieBrute, false, `« ${saisie} » n’a pas été relu comme du base58`);
      assert.notEqual(r.forme, 'invalide');
    }
  }
  // Et les liens figés des puces de l'accueil (`src/i18n/fr.js`) restent
  // canoniques — ce sont les seuls liens de ce dépôt qui vivent hors des tests.
  for (const hash of [
    '#0.1:tca+m14,1.1:tca+mtc+cs,2.1:tca+m14,3.1:tca+mtc+cs,4.1:tca+m14,6.1:tca+m7+cs#yvQYkzhNVYJT8wM8jhvJxSM',
    '#0.1:tca+mch+cs+prn,3.1:fc+nl,5.1:tca+m7+cs#3A8evQZovd7BUyRUF65ToBwrHvW25EUn',
    '#0.1:tca+m14+m36,2.1:fr13+tca+m14+m36#2HuP1G8mNg3sJWhqR',
  ]) {
    const r = lire(hash);
    assert.equal(r.forme, 'canonique', hash);
    assert.equal(r.saisieBrute, false, hash);
  }
});

/**
 * ★ **CE QUE LE SITE ÉCRIT GARDE SON SENS ; CE QU'UN HUMAIN TAPE SUIT LA RÈGLE
 *   SIMPLE DE L'AUTEUR.**
 *
 * `#c111!#…` avait d'abord été lu comme la LISTE dans les deux cas, au motif
 * que c'est la forme que `ecrire({saisie, cible})` produit. « Je veux
 * l'inverse » (l'auteur) : des marqueurs seuls valent la première voie animée,
 * cible comprise.
 *
 * La bascule ne peut pourtant pas être totale, et la raison n'est pas
 * théorique : cette forme est écrite par le SÉLECTEUR DE CIBLE de la page de
 * listing (`pages/resultat.js`, « changer de cible, c'est changer d'URL »). La
 * lire comme une animation ferait sauter dans une démonstration au moment
 * précis où l'on clique sur `[111]` pour voir la liste des voies menant à 111.
 *
 * La frontière retenue est celle que l'auteur a lui-même posée — « la version
 * b58 est bien sûr toujours supportée et à conserver par défaut quand on passe
 * par l'interface du site » : le base58 est la signature de la machine, le
 * texte en clair celle de la main. Ses quatre exemples sont tous en clair.
 */
test('★ saisie en clair — `#c111!#…` ANIME ; en base58 il reste la LISTE', () => {
  // La main : ce que l'auteur demande.
  assert.equal(lire('#c111!#Donald Trump').forme, 'premiere');
  assert.equal(lire('#c111!#Donald Trump').cible.texte, '111');
  assert.equal(lire('#c111!sce!#Donald Trump').forme, 'premiere');

  // La machine : ce que le site écrit se relit comme le site l'entend.
  assert.equal(lire(`#c111!#${B58_HOPE}`).forme, 'resultats');
  const lien = ecrire({ saisie: 'Donald Trump', cible: '111' });
  assert.equal(lire(lien).forme, 'resultats');
  assert.equal(lire(lien).cible.texte, '111');

  // ⚠️ Et la liste reste demandable à la main, sans cible comme avec : deux
  //    dièses, c'est la liste, et cela n'a pas bougé.
  assert.equal(lire('##Donald Trump').forme, 'resultats');
});
