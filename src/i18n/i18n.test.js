/** Tests i18n — `node --test src/i18n/`.
 *
 *  Tout est vérifiable sans DOM : la résolution, la complétude des dictionnaires,
 *  la persistance (magasin injecté) et — le vrai piège — le fait que les deux
 *  langues n'ont PAS les mêmes règles typographiques. */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fr } from './fr.js';
import { en } from './en.js';
import {
  LANGUES, LANGUE_DEFAUT, normaliserLangue, detecterLangue, lireChemin,
  interpoler, resoudre, resoudreValeur, localiser, chemins,
} from './resolution.js';
import { creerI18n, CLE_LANGUE } from './etat.js';

const dictionnaires = { fr, en };
const FINE = '\u202f';   // espace fine insécable

/** Magasin de doublure : un `localStorage` en mémoire. */
function magasinFactice(initial = {}) {
  const boite = { ...initial };
  return {
    boite,
    getItem: (k) => (k in boite ? boite[k] : null),
    setItem: (k, v) => { boite[k] = String(v); },
  };
}

/* ═══════════════════════════ 1. Résolution ═══════════════════════════ */

test('normaliserLangue accepte les étiquettes régionales et rejette le reste', () => {
  assert.equal(normaliserLangue('fr'), 'fr');
  assert.equal(normaliserLangue('fr-BE'), 'fr');
  assert.equal(normaliserLangue('EN_us'), 'en');
  assert.equal(normaliserLangue('  en-GB  '), 'en');
  assert.equal(normaliserLangue('de'), null);
  assert.equal(normaliserLangue('frx'), null);   // pas un préfixe : une autre langue
  assert.equal(normaliserLangue(''), null);
  assert.equal(normaliserLangue(undefined), null);
  assert.equal(normaliserLangue(42), null);
});

test('detecterLangue suit l’ordre de préférence et se replie sur le français', () => {
  assert.equal(detecterLangue(['de', 'en-GB', 'fr']), 'en');
  assert.equal(detecterLangue(['fr-CA', 'en']), 'fr');
  assert.equal(detecterLangue(['ja', 'ko']), 'fr');
  assert.equal(detecterLangue([]), 'fr');
  assert.equal(detecterLangue(undefined), 'fr');
  assert.equal(detecterLangue('en-US'), 'en');       // valeur simple tolérée
  assert.equal(detecterLangue, detecterLangue);
});

test('lireChemin ne jette jamais et rend undefined sur un chemin mort', () => {
  assert.equal(lireChemin(fr, 'entete.theme.clair'), 'Clair');
  assert.equal(lireChemin(fr, 'entete.theme.inexistant'), undefined);
  assert.equal(lireChemin(fr, 'entete.theme.clair.trop.loin'), undefined);
  assert.equal(lireChemin(null, 'a.b'), undefined);
  assert.equal(lireChemin(fr, ''), undefined);
});

test('interpoler remplit les jetons fournis et laisse voir les autres', () => {
  assert.equal(interpoler('Étape {i} sur {total}', { i: 2, total: 5 }), 'Étape 2 sur 5');
  assert.equal(interpoler('Rang {rang}', {}), 'Rang {rang}');
  assert.equal(interpoler('Rang {rang}', { rang: 0 }), 'Rang 0');
  assert.equal(interpoler('Rang {rang}', { rang: null }), 'Rang {rang}');
});

test('resoudre se replie sur le français puis sur le chemin lui-même', () => {
  assert.equal(resoudre(dictionnaires, 'en', 'entete.theme.clair'), 'Light');
  assert.equal(resoudre(dictionnaires, 'fr', 'entete.theme.clair'), 'Clair');
  // langue inconnue → repli français
  assert.equal(resoudre(dictionnaires, 'de', 'entete.theme.clair'), 'Clair');
  // clé absente partout → le chemin brut, signal de développement lisible
  assert.equal(resoudre(dictionnaires, 'fr', 'ceci.nexiste.pas'), 'ceci.nexiste.pas');
  // une valeur non-chaîne (un objet) n'est pas une traduction
  assert.equal(resoudre(dictionnaires, 'fr', 'entete.theme'), 'entete.theme');
});

test('resoudreValeur rend les listes telles quelles', () => {
  assert.ok(Array.isArray(resoudreValeur(dictionnaires, 'en', 'accueil.exemples')));
  assert.equal(resoudreValeur(dictionnaires, 'en', 'accueil.exemples')[1], 'Donald Trump');
  assert.equal(resoudreValeur(dictionnaires, 'fr', 'accueil.exemples')[3], 'Capitalisme');
  // ★ Une puce peut être un RACCOURCI : un objet `{texte, hash}` qui mène droit
  // à une démonstration choisie, au lieu de recopier son texte dans le champ.
  for (const langue of ['fr', 'en']) {
    const raccourci = resoudreValeur(dictionnaires, langue, 'accueil.exemples')
      .find((x) => x && typeof x === 'object');
    assert.ok(raccourci, `${langue} : plus aucune puce ne mène à une voie choisie`);
    assert.match(raccourci.hash, /^#[^#]*#[1-9A-HJ-NP-Za-km-z]+$/,
      `${langue} : le raccourci n’est pas une URL de démonstration`);
    assert.ok(raccourci.aide && raccourci.aide.length > raccourci.texte.length,
      `${langue} : le raccourci ne dit pas où il mène`);
  }
});

/* ══════════ 2. Libellés {fr, en} produits par le catalogue ══════════ */

test('localiser consomme la forme {fr, en} du catalogue', () => {
  const libelle = { fr: 'Chaque lettre vaut son rang', en: 'Each letter is worth its rank' };
  assert.equal(localiser(libelle, 'en'), 'Each letter is worth its rank');
  assert.equal(localiser(libelle, 'fr'), 'Chaque lettre vaut son rang');
  // langue absente de l'objet → repli français, jamais de vide
  assert.equal(localiser({ fr: 'Seulement en français' }, 'en'), 'Seulement en français');
});

test('localiser tolère une chaîne nue et l’absence de valeur', () => {
  assert.equal(localiser('déjà une chaîne', 'en'), 'déjà une chaîne');
  assert.equal(localiser(null, 'fr'), '');
  assert.equal(localiser(undefined, 'en'), '');
});

/* ═════════════════════ 3. Complétude des dictionnaires ═════════════════════ */

test('aucune clé ne manque dans une langue, dans aucun des deux sens', () => {
  const cheminsFr = chemins(fr).sort();
  const cheminsEn = chemins(en).sort();
  const manquantEn = cheminsFr.filter((c) => !cheminsEn.includes(c));
  const manquantFr = cheminsEn.filter((c) => !cheminsFr.includes(c));
  assert.deepEqual(manquantEn, [], 'clés absentes de en.js');
  assert.deepEqual(manquantFr, [], 'clés absentes de fr.js');
});

test('aucune valeur vide, aucune valeur restée identique par oubli de traduction', () => {
  // Liste blanche : ce qui DOIT rester identique dans les deux langues.
  const identiquesLegitimes = new Set([
    'code', 'autonyme',
    'global.titre', 'global.logoTexte', 'global.suffixeTitre',
    // Ces trois-là sont des ÉCHANTILLONS DE GRAMMAIRE d'URL, pas des phrases :
    // `sobre!` et `scenique!` s'écrivent pareil dans les deux langues, parce
    // que la grammaire n'a qu'une langue (`src/recherche/url.js`).
    'resultat.memo.resonance', 'resultat.memo.portee', 'resultat.memo.registre',
    'demo.raccourcis.d', 'demo.debug.url', 'demo.debug.source',
    'registre.transformation',   // « Transformation » s'écrit pareil dans les deux langues
    // Le badge de séries du listing (« 5 × 6⋅6⋅6 ») est un DESSIN, pas une
    // phrase : un chiffre, un signe multiplié, trois 6 séparés de points
    // médians. Il n'a pas plus de langue qu'un cadran. La phrase que lit un
    // lecteur d'écran, elle, est traduite — c'est `resultat.voieSeries`.
    'resultat.voieSeriesBadge',
    'transport.pauseCourt',
  ]);
  // On COLLECTE tous les manquements avant d'échouer : un `assert` par clé
  // s'arrêterait au premier et masquerait les suivants.
  const griefs = [];
  for (const chemin of chemins(fr)) {
    const a = lireChemin(fr, chemin);
    const b = lireChemin(en, chemin);
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) griefs.push(`${chemin} : listes de tailles différentes`);
      continue;
    }
    if (typeof a !== 'string') { griefs.push(`${chemin} : fr n’est pas une chaîne`); continue; }
    if (typeof b !== 'string') { griefs.push(`${chemin} : en n’est pas une chaîne`); continue; }
    if (!a.trim().length) griefs.push(`${chemin} : fr est vide`);
    if (!b.trim().length) griefs.push(`${chemin} : en est vide`);
    if (a === b && !identiquesLegitimes.has(chemin)) {
      griefs.push(`${chemin} : traduction anglaise oubliée (valeur identique)`);
    }
  }
  assert.deepEqual(griefs, []);
});

/** Échantillons de grammaire d'URL affichés littéralement : leurs accolades ne
 *  sont pas des jetons d'interpolation mais la notation de la grammaire (§4.2). */
const echantillonsDeGrammaire = new Set([
  'resultat.memo.grammaire', 'resultat.memo.resonance', 'resultat.memo.portee',
  'resultat.memo.registre',
]);

test('les jetons {nom} d’une clé sont les mêmes dans les deux langues', () => {
  const jetons = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(',');
  for (const chemin of chemins(fr)) {
    if (echantillonsDeGrammaire.has(chemin)) continue;
    const a = lireChemin(fr, chemin);
    const b = lireChemin(en, chemin);
    if (typeof a !== 'string' || typeof b !== 'string') continue;
    assert.equal(jetons(a), jetons(b), `${chemin} : jetons d’interpolation divergents`);
  }
});

/* ═════════ 4. Typographie — les deux langues n'ont PAS les mêmes règles ═════════ */

const feuillesTexte = (dico) => chemins(dico)
  .map((c) => [c, lireChemin(dico, c)])
  .filter(([, v]) => typeof v === 'string');

test('le français ne pose jamais une espace ordinaire devant ! ? ; :', () => {
  for (const [chemin, valeur] of feuillesTexte(fr)) {
    // Les `://` d'une URL ne sont pas une ponctuation haute.
    const suspect = valeur.replace(/:\/\//g, '');
    assert.ok(!/ [!?;:]/.test(suspect), `${chemin} : espace ordinaire devant une ponctuation haute — ${valeur}`);
    assert.ok(!/ [!?;:]/.test(suspect), `${chemin} : insécable large au lieu d’une fine — ${valeur}`);
  }
});

test('le français emploie la fine insécable et les guillemets français', () => {
  const toutFr = feuillesTexte(fr).map(([, v]) => v).join('\n');
  assert.ok(toutFr.includes(FINE + ':'), 'aucune fine insécable devant un deux-points');
  assert.ok(toutFr.includes('«') && toutFr.includes('»'), 'aucun guillemet français');
  // Les seuls guillemets droits admis en français sont ceux des attributs HTML
  // du pied de page — on les retire avant de vérifier la prose.
  const proseFr = toutFr.replace(/<[^>]*>/g, '');
  assert.ok(!proseFr.includes('"'), 'guillemet droit trouvé dans la prose française');
});

test('l’anglais n’hérite d’aucune règle française', () => {
  for (const [chemin, valeur] of feuillesTexte(en)) {
    assert.ok(!valeur.includes(FINE), `${chemin} : fine insécable française en anglais — ${valeur}`);
    assert.ok(!valeur.includes(' '), `${chemin} : insécable avant ponctuation en anglais — ${valeur}`);
    assert.ok(!valeur.includes('«') && !valeur.includes('»'),
      `${chemin} : guillemets français en anglais — ${valeur}`);
    const suspect = valeur.replace(/:\/\//g, '');
    assert.ok(!/ [!?;:]/.test(suspect), `${chemin} : espace avant ponctuation en anglais — ${valeur}`);
  }
});

test('l’anglais cite avec des guillemets droits doubles', () => {
  assert.ok(lireChemin(en, 'resultat.memo.grammaireTexte').includes('"'));
});

/* ═══════════════════════ 5. État, persistance, abonnement ═══════════════════════ */

test('sans choix persisté, la langue vient du navigateur', () => {
  const i18n = creerI18n({ dictionnaires, magasin: magasinFactice(), languesNavigateur: ['en-GB', 'fr'] });
  assert.equal(i18n.langue(), 'en');
  assert.equal(i18n.langueChoisie(), null);
});

test('sans choix persisté ni navigateur reconnu, la langue est le français', () => {
  const i18n = creerI18n({ dictionnaires, magasin: magasinFactice(), languesNavigateur: ['ja'] });
  assert.equal(i18n.langue(), 'fr');
});

test('un choix persisté prime sur le navigateur', () => {
  const magasin = magasinFactice({ [CLE_LANGUE]: 'fr' });
  const i18n = creerI18n({ dictionnaires, magasin, languesNavigateur: ['en-US'] });
  assert.equal(i18n.langue(), 'fr');
  assert.equal(i18n.langueChoisie(), 'fr');
});

test('une valeur persistée corrompue est ignorée sans jeter', () => {
  const magasin = magasinFactice({ [CLE_LANGUE]: 'klingon' });
  const i18n = creerI18n({ dictionnaires, magasin, languesNavigateur: ['en'] });
  assert.equal(i18n.langue(), 'en');
  assert.equal(i18n.langueChoisie(), null);
});

test('definirLangue persiste, prévient, et ne prévient pas deux fois pour rien', () => {
  const magasin = magasinFactice();
  const i18n = creerI18n({ dictionnaires, magasin, languesNavigateur: ['fr'] });
  const vues = [];
  const off = i18n.onLangue((l) => vues.push(l));

  i18n.definirLangue('en');
  assert.equal(i18n.langue(), 'en');
  assert.equal(magasin.boite[CLE_LANGUE], 'en');
  assert.equal(i18n.t('entete.theme.sombre'), 'Dark');

  i18n.definirLangue('en');          // même langue : aucun évènement
  i18n.definirLangue('klingon');     // langue inconnue : refusée
  assert.deepEqual(vues, ['en']);

  off();
  i18n.definirLangue('fr');
  assert.deepEqual(vues, ['en']);    // désabonné
  assert.equal(i18n.langue(), 'fr');
});


test('choisir la langue DÉJÀ affichée persiste quand même le choix', () => {
  // Sans cette écriture, « je garde le français » ne survivrait pas à un
  // navigateur qui passerait à l'anglais : le choix explicite doit primer.
  const magasin = magasinFactice();
  const i18n = creerI18n({ dictionnaires, magasin, languesNavigateur: ['fr'] });
  const vues = [];
  i18n.onLangue((l) => vues.push(l));
  i18n.definirLangue('fr');
  assert.equal(magasin.boite[CLE_LANGUE], 'fr');
  assert.equal(i18n.langueChoisie(), 'fr');
  assert.deepEqual(vues, [], 'aucun re-rendu inutile');
  // une langue inconnue n'écrit rien
  i18n.definirLangue('klingon');
  assert.equal(magasin.boite[CLE_LANGUE], 'fr');
});

test('un magasin qui jette ne casse pas l’initialisation', () => {
  const magasinHostile = {
    getItem() { throw new Error('mode privé'); },
    setItem() { throw new Error('mode privé'); },
  };
  const i18n = creerI18n({ dictionnaires, magasin: magasinHostile, languesNavigateur: ['en'] });
  assert.equal(i18n.langue(), 'en');
  assert.doesNotThrow(() => i18n.definirLangue('fr'));
  assert.equal(i18n.langue(), 'fr');
});

test('sans magasin du tout, tout fonctionne encore', () => {
  const i18n = creerI18n({ dictionnaires, languesNavigateur: ['fr'] });
  assert.equal(i18n.langue(), 'fr');
  i18n.definirLangue('en');
  assert.equal(i18n.langue(), 'en');
});

test('l’autonyme n’est jamais traduit', () => {
  const i18n = creerI18n({ dictionnaires, languesNavigateur: ['en'] });
  assert.equal(i18n.autonyme('fr'), 'Français');
  assert.equal(i18n.autonyme('en'), 'English');
  i18n.definirLangue('fr');
  assert.equal(i18n.autonyme('en'), 'English');
});

test('les deux langues du site, et rien d’autre', () => {
  assert.deepEqual(LANGUES, ['fr', 'en']);
  assert.equal(LANGUE_DEFAUT, 'fr');
});
