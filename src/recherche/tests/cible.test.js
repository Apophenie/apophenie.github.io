/** Tests de la CIBLE — viser autre chose que 666.
 *
 *  ★ **Le premier tiers de ce fichier ne teste pas une fonctionnalité : il
 *  teste une NON-RÉGRESSION.** Toute la généralisation repose sur une
 *  affirmation — « quand la cible vaut 666, rien ne change » — et une
 *  affirmation qu'aucun test ne tient est un vœu. Les tests marqués « repli
 *  exact » comparent donc l'ancien calcul, réécrit ici en toutes lettres, au
 *  nouveau : si l'un des deux dérive, le fichier le dit.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  lireCible, normaliserCible, seriesDe, indexUtiles, ecrit, verdict,
  CIBLE_DEFAUT, TEXTE_DEFAUT, MAX_CHIFFRES,
} from '../cible.js';
import { lire, ecrire, REGISTRE_DEFAUT, registreEffectif, registresDisponibles, autreRegistre } from '../url.js';
import { creerMoteur } from '../index.js';
import { operateursPourCible, operateursExplorables } from '../bfs.js';
import { serieDeSix, sixDuChemin, compterMoisson, verdictDe } from '../assemblage.js';
import { nbTriptyques, finDuTriptyque } from '../elegance.js';
import { catalogue } from './_catalogue.js';
import { encoderTexte } from '../base58.js';

const moteur = creerMoteur(catalogue, { filetTemporel: false });

/* ══════════════════════════ 1. La cible, valeur ══════════════════════════ */

test('cible — une suite de chiffres, jamais un nombre', () => {
  const c = lireCible('007');
  assert.equal(c.texte, '007');
  assert.deepEqual([...c.chiffres], [0, 0, 7]);
  assert.equal(c.longueur, 3);
  assert.deepEqual([...c.alphabet], [0, 7]);
  assert.equal(c.homogene, false);
  assert.equal(c.defaut, false);
  // ★ Le nombre n'existe QUE si l'écriture décimale le retrouve. `Number('007')`
  //   vaut 7, et un `NUM` valant 7 ne démontre pas 007 : il démontre 7.
  assert.equal(c.nombre, null);
  assert.equal(lireCible('000').nombre, null);
  assert.equal(lireCible('666').nombre, 666);
  assert.equal(lireCible('13').nombre, 13);
});

test('cible — les cinq exemples de l’auteur se lisent tous', () => {
  for (const t of ['111', '777', '13', '007', '000']) {
    const c = lireCible(t);
    assert.ok(c, t);
    assert.equal(c.texte, t, `l’écriture est conservée telle quelle : ${t}`);
  }
  assert.equal(lireCible('111').homogene, true);
  assert.equal(lireCible('13').homogene, false);
  assert.equal(lireCible('13').longueur, 2, 'ni longueur trois, ni chiffre répété');
});

test('cible — ce qui n’est pas une suite de chiffres est refusé', () => {
  /* ⚠️ La liste portait « 1234567 » comme exemple de suite TROP LONGUE. Sept
     chiffres l'étaient quand le plafond valait six ; ils ne le sont plus depuis
     qu'il vaut dix (`cible.js › MAX_CHIFFRES`, relevé pour les dates de
     naissance). Un littéral qui dépend d'une constante sans la nommer se périme
     en silence : la longueur excessive est éprouvée deux lignes plus bas, DÉRIVÉE
     du plafond, et cette liste-ci ne garde que ce qui n'est pas une suite de
     chiffres — ce qu'annonce son titre. */
  for (const mauvais of ['', '  ', 'six', '6,6', '6.6', '-6', '6 6', null, undefined, {}]) {
    assert.equal(lireCible(mauvais), null, JSON.stringify(mauvais));
  }
  assert.equal(lireCible('9'.repeat(MAX_CHIFFRES)).longueur, MAX_CHIFFRES, 'le plafond est atteignable');
  assert.equal(lireCible('9'.repeat(MAX_CHIFFRES + 1)), null, 'et il est un plafond');
});

test('cible — normaliserCible ne rend JAMAIS null : le moteur ne reste pas bredouille', () => {
  assert.equal(normaliserCible(undefined), CIBLE_DEFAUT);
  assert.equal(normaliserCible('').texte, TEXTE_DEFAUT);
  assert.equal(normaliserCible('pas une cible').texte, TEXTE_DEFAUT);
  assert.equal(normaliserCible('111').texte, '111');
  // Une cible déjà lue n'est pas relue.
  const c = lireCible('13');
  assert.equal(normaliserCible(c), c);
});

/* ═══════════ 2. Le repli EXACT sur l'ancien calcul, quand c'est 666 ═══════ */

/** L'ANCIEN algorithme, recopié tel qu'il était avant la cible. */
function ancienGroupementParTrois(valeurs) {
  const indices = [];
  for (let i = 0; i < valeurs.length; i++) if (valeurs[i] === 6) indices.push(i);
  const series = Math.floor(indices.length / 3);
  return series < 1 ? [] : indices.slice(0, series * 3);
}

/** L'ANCIEN `nbTriptyques`, à l'identique. */
function ancienNbTriptyques(valeurs) {
  let total = 0;
  let suite = 0;
  for (const v of valeurs) {
    if (v === 6) suite++;
    else { total += Math.floor(suite / 3); suite = 0; }
  }
  return total + Math.floor(suite / 3);
}

/** L'ANCIEN `finDuTriptyque`, à l'identique. */
function ancienFinDuTriptyque(valeurs) {
  let suite = 0;
  for (let i = 0; i < valeurs.length; i++) {
    suite = valeurs[i] === 6 ? suite + 1 : 0;
    if (suite >= 3) return i + 1;
  }
  return 0;
}

/** Toutes les suites de longueur `n` sur l'alphabet donné — énumération
 *  exhaustive et déterministe : aucun tirage aléatoire (§4.4 règle 4). */
function toutesLesSuites(alphabet, n) {
  let out = [[]];
  for (let i = 0; i < n; i++) {
    const suivant = [];
    for (const s of out) for (const v of alphabet) suivant.push([...s, v]);
    out = suivant;
  }
  return out;
}

test('★ repli exact — « les 6 groupés par trois » et « les positions qui écrivent 666 »', () => {
  // Exhaustif sur 4^6 = 4 096 vecteurs : de quoi couvrir toutes les
  // configurations de 6 contigus, dispersés, en surnombre ou en défaut.
  let compares = 0;
  for (const v of toutesLesSuites([6, 6, 5, 0], 6)) {
    const attendu = ancienGroupementParTrois(v);
    const obtenu = seriesDe(v, CIBLE_DEFAUT).flat();
    assert.deepEqual(obtenu, attendu, `vecteur ${v.join(',')}`);
    compares++;
  }
  assert.equal(compares, 4096);
});

test('★ repli exact — nbTriptyques et finDuTriptyque sur la cible par défaut', () => {
  for (const v of toutesLesSuites([6, 5, 0], 7)) {
    assert.equal(nbTriptyques(v), ancienNbTriptyques(v), `nbTriptyques ${v.join(',')}`);
    assert.equal(finDuTriptyque(v), ancienFinDuTriptyque(v), `finDuTriptyque ${v.join(',')}`);
  }
});

test('★ repli exact — indexUtiles compte les 6, et rien d’autre', () => {
  for (const v of toutesLesSuites([6, 1, 9], 5)) {
    const attendu = v.map((x, i) => (x === 6 ? i : -1)).filter((i) => i >= 0);
    assert.deepEqual(indexUtiles(v, CIBLE_DEFAUT), attendu);
  }
});

/* ══════════════════ 3. Ce que la généralisation apporte ═════════════════ */

test('cible — les positions qui écrivent la suite, dans l’ordre de lecture', () => {
  const c = lireCible('007');
  // `0 7 0 0 7` : le premier 7 ne sert pas — il faut deux zéros AVANT lui.
  assert.deepEqual(seriesDe([0, 7, 0, 0, 7], c), [[0, 2, 4]]);
  assert.deepEqual(seriesDe([0, 0, 7, 0, 0, 7], c), [[0, 1, 2], [3, 4, 5]]);
  assert.deepEqual(seriesDe([7, 7, 7], c), []);
  // `13` : deux chiffres, deux positions.
  assert.deepEqual(seriesDe([1, 3, 1, 3], lireCible('13')), [[0, 1], [2, 3]]);
  // `000` : trois zéros, et rien d'autre ne compte.
  assert.deepEqual(seriesDe([0, 5, 0, 0], lireCible('000')), [[0, 2, 3]]);
});

test('cible — le plafond de séries est respecté', () => {
  assert.equal(seriesDe(Array(30).fill(6), CIBLE_DEFAUT, 4).length, 4);
});

test('cible — le verdict s’écrit avec les ZÉROS DE TÊTE', () => {
  assert.equal(verdict(1, CIBLE_DEFAUT), '666');
  assert.equal(verdict(3, CIBLE_DEFAUT), '666 666 666');
  assert.equal(verdict(2, lireCible('007')), '007 007', 'jamais « 7 7 »');
  assert.equal(verdict(1, lireCible('000')), '000');
  assert.equal(verdict(0, lireCible('13')), '13', 'zéro série vaut une : on n’écrit pas le vide');
});

test('cible — `ecrit` répond oui dès qu’une série existe', () => {
  assert.equal(ecrit([1, 6, 6, 6], CIBLE_DEFAUT), true);
  assert.equal(ecrit([6, 6], CIBLE_DEFAUT), false);
  assert.equal(ecrit([0, 0, 7], lireCible('007')), true);
  assert.equal(ecrit([7, 0, 0], lireCible('007')), false);
});

/* ════════════════════════ 4. La cible dans l'URL ════════════════════════ */

const B58 = encoderTexte('hope');

test('url — le marqueur de cible se lit, et il n’est pas écrit au défaut', () => {
  // ★ NON-RÉGRESSION : un lien sans marqueur vise 666, et un lien qui vise 666
  //   n'en porte pas. C'est ce qui garantit que la forme canonique de tous les
  //   liens existants est inchangée, au caractère près.
  const nu = ecrire({ saisie: 'hope', fragments: [{ portee: null, resonance: null, codes: ['nd'] }] });
  assert.equal(nu, `#so!nd#${B58}`, 'aucun `c666!` dans une URL ordinaire');
  assert.equal(lire(nu).cible.texte, '666');
  assert.equal(lire(nu).cibleEcrite, false);

  const vise = ecrire({
    saisie: 'hope', cible: '111',
    fragments: [{ portee: null, resonance: null, codes: ['nd'] }],
  });
  assert.equal(vise, `#so!c111!nd#${B58}`);
  const l = lire(vise);
  assert.equal(l.forme, 'canonique');
  assert.equal(l.cible.texte, '111');
  assert.equal(l.cibleEcrite, true);
  assert.deepEqual(l.fragments, [{ portee: null, resonance: null, codes: ['nd'] }]);
});

test('url — les deux marqueurs se lisent dans l’un OU l’autre ordre', () => {
  const a = lire(`#sce!c111!nd#${B58}`);
  const b = lire(`#c111!sce!nd#${B58}`);
  assert.equal(a.cible.texte, '111');
  assert.equal(b.cible.texte, '111');
  assert.deepEqual(a.fragments, b.fragments);
});

test('url — `cs+mch` reste un programme, `c111!` reste un marqueur', () => {
  const prog = lire(`#cs+mch#${B58}`, { catalogue });
  assert.equal(prog.forme, 'canonique');
  assert.equal(prog.cible.texte, '666', 'aucun marqueur : la cible par défaut');
  assert.deepEqual(prog.fragments, [{ portee: null, resonance: null, codes: ['cs', 'mch'] }]);

  const avecCible = lire(`#c111!cs+mch#${B58}`, { catalogue });
  assert.equal(avecCible.cible.texte, '111');
  assert.deepEqual(avecCible.fragments, [{ portee: null, resonance: null, codes: ['cs', 'mch'] }]);
});

test('url — `#c111!#…` est la PAGE DE RÉSULTATS pour 111', () => {
  const r = lire(`#c111!#${B58}`);
  assert.equal(r.forme, 'resultats');
  assert.equal(r.saisie, 'hope');
  assert.equal(r.cible.texte, '111');
  // Et c'est bien ce que `ecrire` produit sans programme.
  assert.equal(ecrire({ saisie: 'hope', cible: '111' }), `#c111!#${B58}`);
  assert.equal(ecrire({ saisie: 'hope' }), `##${B58}`, 'la cible par défaut ne s’écrit pas');
});

test('url — une cible illisible s’ANNONCE au lieu de retomber en silence sur 666', () => {
  // La cible est illisible par sa LONGUEUR, dérivée du plafond — voir le pavé
  // du test « ce qui n'est pas une suite de chiffres est refusé ».
  const r = lire(`#c${'9'.repeat(MAX_CHIFFRES + 1)}!nd#${B58}`);
  assert.equal(r.forme, 'invalide');
  assert.ok(r.bandeau, 'un lien ne renvoie jamais silencieusement ailleurs (§4.3)');
});

test('url — la cible survit à la forme héritée (des rangs, pas un programme)', () => {
  const r = lire(`#c111!3#${B58}`);
  assert.equal(r.forme, 'heritee');
  assert.deepEqual(r.rangs, [3]);
  assert.equal(r.cible.texte, '111', 'on relance la recherche, mais sur la bonne cible');
});

/* ═════════════ 5. Le registre : défaut sobre, et repli sobre ═════════════ */

test('★ registre — le défaut est SOBRE : la mise en scène s’opte', () => {
  assert.equal(REGISTRE_DEFAUT, 'sobre');
  assert.equal(lire(`#nd#${B58}`).registre, 'sobre');
});

test('★ registre — une cible sans emblème replie « scénique » sur « sobre »', () => {
  // Le décor du verdict est celui du 666 (les cornes). Les autres cibles n'ont
  // pas encore d'emblème (`.planning/A-VENIR-cibles.md`) : on ne joue pas des
  // cornes au-dessus d'un 111, et on n'échoue pas non plus — on retombe sur le
  // plus neutre.
  assert.equal(registreEffectif('scenique', '666'), 'scenique');
  assert.equal(registreEffectif('scenique', '111'), 'sobre');
  assert.equal(registreEffectif('sobre', '666'), 'sobre');

  // À la LECTURE…
  const lu = lire(`#sce!c111!nd#${B58}`);
  assert.equal(lu.registre, 'sobre', 'ce qu’on jouera');
  assert.equal(lu.registreDemande, 'scenique', 'ce que le lien portait');

  // …et à l'ÉCRITURE, sans quoi l'aller-retour mentirait.
  const ecrit111 = ecrire({
    saisie: 'hope', cible: '111', registre: 'scenique',
    fragments: [{ portee: null, resonance: null, codes: ['nd'] }],
  });
  assert.equal(ecrit111, `#so!c111!nd#${B58}`);
  assert.equal(lire(ecrit111).registre, 'sobre');
});

test('★ registre — une cible sans emblème n’offre qu’un accès', () => {
  assert.deepEqual(registresDisponibles('666'), ['sobre', 'scenique']);
  assert.deepEqual(registresDisponibles('007'), ['sobre']);
  assert.equal(autreRegistre('sobre', '666'), 'scenique');
  assert.equal(autreRegistre('sobre', '007'), null, 'pas de second bouton : rien à basculer');
});

/* ════════════════ 6. Le moteur : non-régression sur 666 ═════════════════ */

/** Ce qu'une liste de voies a d'observable — tout ce dont un lien dépend. */
const empreinte = (r) => (r.approches || []).map((a) => [
  a.rang, a.mode, a.series ?? 1, a.score, a.codes, a.url, a.urlSobre, a.urlScenique,
].join('|'));

const TEMOINS = ['hope-hope-hope.fr', 'Macron', 'Capitalisme', 'https://reinfocovid.fr/'];

test('★ NON-RÉGRESSION — demander 666 explicitement ne change RIEN', () => {
  for (const saisie of TEMOINS) {
    const sans = moteur.resoudre(saisie);
    const avec = moteur.resoudre(saisie, { cible: '666' });
    assert.deepEqual(empreinte(avec), empreinte(sans), saisie);
    assert.deepEqual(
      (avec.fragments || []).map((f) => f.url),
      (sans.fragments || []).map((f) => f.url), `fragments de ${saisie}`,
    );
  }
});

test('★ NON-RÉGRESSION — aucune URL de la cible par défaut ne porte de marqueur', () => {
  for (const saisie of TEMOINS) {
    const r = moteur.resoudre(saisie);
    for (const a of r.approches) {
      assert.ok(!a.url.includes('!c'), `${saisie} : ${a.url}`);
      assert.ok(!/#c\d+!/.test(a.url), `${saisie} : ${a.url}`);
    }
    assert.equal(r.urlResultats, `##${encoderTexte(saisie)}`);
  }
});

test('★ NON-RÉGRESSION — les opérateurs restent explorables pour 666, aux objets près', () => {
  const tous = operateursExplorables(catalogue);
  const pour666 = operateursPourCible(catalogue, normaliserCible('666'));
  assert.deepEqual(pour666.map((o) => o.code), tous.map((o) => o.code));
  // ★ Identité, pas seulement égalité de codes : le moteur compare des
  //   opérateurs par RÉFÉRENCE (`bfs.js › conventionContraire`), et deux
  //   descripteurs jumeaux mais distincts y feraient diverger un classement.
  pour666.forEach((o, i) => assert.equal(o, tous[i], `${o.code} : même objet qu'avant`));
});

test('★ la classification face à la cible est DÉRIVÉE, jamais recopiée', () => {
  // ★ CONTRACTS §0.3. Il n'existe aucune liste d'opérateurs « liés à 666 » :
  //   la classe se CALCULE en montrant la cible à l'opérateur. Ce test ne
  //   nomme donc aucune liste attendue — il vérifie la MÉCANIQUE, et les
  //   conséquences que la mécanique implique.
  const tous = operateursExplorables(catalogue);
  const lisent = tous.filter((o) => typeof o.viser === 'function');
  assert.ok(lisent.length, 'au moins un opérateur lit la cible');

  // 1. Un opérateur sans `viser` ne PEUT pas dépendre de la cible : il n'a
  //    aucun moyen de l'apprendre. C'est ce qui rend la classe « indifférent »
  //    vérifiable sans faire confiance à personne.
  for (const o of tous) {
    if (typeof o.viser === 'function') continue;
    assert.equal(o.visee, undefined, `${o.code} : pas de visée sans canal`);
  }

  // 2. Le repli sur 666 est EXACT, jusqu'à l'identité.
  for (const o of lisent) assert.equal(o.viser('666'), o, `${o.code} : viser(666) === lui-même`);

  // 3. Et l'ensemble explorable d'une cible EST celui que la classification
  //    annonce — les deux se lisent au même endroit, donc ils ne peuvent pas
  //    diverger. C'est très exactement ce que l'ancienne liste ne garantissait
  //    pas.
  for (const texte of ['111', '13', '007', '000', '01111984']) {
    const attendu = tous
      .map((o) => (typeof o.viser === 'function' ? o.viser(texte) : o))
      .filter(Boolean);
    assert.deepEqual(
      operateursPourCible(catalogue, normaliserCible(texte)).map((o) => o.code),
      attendu.map((o) => o.code),
      `explorables de ${texte}`,
    );
  }
});

test('★ ce qu’un opérateur ANNONCE est ce qu’il applique, cible comprise', () => {
  // ★ CONTRACTS §0.3 encore : un opérateur visé porte la règle de ce qu'il
  //   fera, pas celle qu'il faisait en visant 666. Sans cela, la lightbox du
  //   récapitulatif décrirait « trois 6 d'affilée » au-dessus d'une scène qui
  //   cherche trois 1.
  const m36 = operateursExplorables(catalogue).find((o) => o.code === 'm36');
  if (!m36 || typeof m36.viser !== 'function') return; // catalogue jouet
  const vise = m36.viser('111');
  assert.ok(vise.regle.fr.includes('1'), vise.regle.fr);
  assert.ok(!vise.regle.fr.includes(' 6 '), `la règle ne parle plus du 6 : ${vise.regle.fr}`);
  assert.equal(vise.code, m36.code, 'le code ne change pas — c’est la CIBLE qui change');
  assert.equal(vise.id, m36.id);
});

/* ═══════════════ 7. Le moteur : viser réellement autre chose ════════════ */

test('★ le moteur atteint les cinq cibles de l’auteur', () => {
  const saisie = 'hope-hope-hope.fr';
  for (const texte of ['111', '777', '13', '000']) {
    const c = lireCible(texte);
    const r = moteur.resoudre(saisie, { cible: texte });
    assert.ok(r.approches.length, `aucune voie pour ${texte}`);
    assert.equal(r.cible.texte, texte);
    for (const a of r.approches) {
      assert.ok(a.url.includes(`c${texte}!`), `l’URL porte la cible : ${a.url}`);
      assert.equal(verdictDe(a), verdict(a.series || 1, c), `verdict de ${texte}`);
    }
  }
});

test('★ chaque part d’une approche rend le chiffre de son RANG', () => {
  // C'est la promesse de la généralisation : sur `007`, le premier morceau
  // donne 0, le deuxième 0, le troisième 7. On le vérifie sur les modes à
  // plusieurs parts, qui sont les seuls où la question se pose.
  const c = lireCible('007');
  const r = moteur.resoudre('hope-hope-hope.fr', { cible: '007' });
  assert.ok(r.approches.length, 'aucune voie pour 007');
  for (const a of r.approches) {
    if (a.parts.length !== c.longueur) continue;
    if (compterMoisson(a.parts, c)) continue;    // la moisson lit la concaténation
    if (serieDeSix(a.parts[0].chemin, c)) continue; // le groupement lit un vecteur
    a.parts.forEach((p, i) => {
      const fin = p.chemin.etats[p.chemin.etats.length - 1];
      if (fin.type !== 'NUM') return;
      assert.equal(fin.valeur, c.chiffres[i], `part ${i} de ${a.codes}`);
    });
  }
});

test('★ un lien à cible se rejoue à l’identique — même score, même rang', () => {
  for (const texte of ['666', '111', '13', '007', '000']) {
    const r = moteur.resoudre('hope-hope-hope.fr', { cible: texte });
    const a = r.approches[0];
    if (!a) continue;
    const lecture = lire(a.url, { catalogue });
    assert.equal(lecture.forme, 'canonique', texte);
    assert.equal(lecture.cible.texte, texte);
    const rejeu = moteur.rejouer(lecture);
    assert.ok(rejeu.ok, `${texte} : ${rejeu.raison || ''}`);
    assert.equal(rejeu.approche.score, a.score, `score de ${texte}`);
    assert.equal(rejeu.approche.mode, a.mode, `mode de ${texte}`);
    assert.equal(rejeu.approche.url, a.url, `URL de ${texte}`);
  }
});

test('★ le scénario découpe le verdict à la longueur de la CIBLE', () => {
  for (const texte of ['666', '13', '007']) {
    const c = lireCible(texte);
    const r = moteur.resoudre('hope-hope-hope.fr', { cible: texte });
    const a = r.approches[0];
    if (!a) continue;
    const sc = moteur.scenarioDe(a, { saisie: 'hope-hope-hope.fr', cible: c });
    assert.equal(sc.result, verdict(a.series || 1, c), `verdict du scénario ${texte}`);
    const reveals = sc.steps.flatMap((s) => s.ops).filter((o) => o.op === 'reveal');
    assert.ok(reveals.length, `aucun reveal pour ${texte}`);
    for (const o of reveals) {
      assert.equal(o.serie, c.longueur, `la série du reveal suit la cible (${texte})`);
    }
  }
});

/**
 * ★ LE TRI FINAL NE DIT PLUS « les 6 » QUAND CE SONT DES 7.
 *
 * « "On ne garde que les 6", or ce sont les 7 que tu gardes » — l'auteur, sur
 * `#so!c777!tca+masb+mrn#Hi75aotg77MXEgC`. Le libellé était une constante recopiée
 * de plus (`cible.js`, en-tête) : il survivait au changement de cible sans que
 * rien ne le contredise.
 *
 * Trois choses sont gelées ici, et la première suffirait à faire échouer
 * l'ancien code :
 *
 *  1. **le titre ne nomme jamais un chiffre étranger à la cible** — sur `777`
 *     il ne peut pas contenir « 6 », sur `111` pas davantage ;
 *  2. **la longueur de série suit la cible** — « séries de deux » sur `13`, et
 *     non « séries de trois », second `trois` en dur qui s'entendait moins ;
 *  3. **les deux langues répondent**, et aucune ne retombe sur l'autre : un
 *     libellé français dans un Registre anglais serait la divergence que le
 *     bilinguisme interdit (`src/moteur/i18n.js`).
 */
test('★ le tri final nomme la CIBLE, jamais un 6 en dur', () => {
  for (const texte of ['666', '777', '111', '13']) {
    const c = lireCible(texte);
    const r = moteur.resoudre('hope-hope-hope.fr', { cible: texte });
    let vus = 0;
    for (const a of r.approches) {
      for (const langue of ['fr', 'en']) {
        const sc = moteur.scenarioDe(a, { saisie: 'hope-hope-hope.fr', cible: c, langue });
        const tri = sc.steps.find((s) => s.recolte);
        if (!tri) continue;
        vus++;
        assert.equal(tri.recolte.cible, texte, `${texte}/${langue} : la récolte porte sa cible`);
        assert.ok(tri.title && tri.caption, `${texte}/${langue} : ${a.codes} — titre et légende`);
        // Aucun chiffre hors de la cible ne peut être nommé : c'est le défaut
        // rapporté, réduit à une assertion.
        for (const d of '0123456789') {
          if (c.texte.includes(d)) continue;
          assert.ok(!tri.title.includes(d),
            `${texte}/${langue} : « ${tri.title} » nomme un ${d} étranger à la cible`);
        }
        if (!tri.recolte.majoritaire && c.longueur > 1) {
          const mot = langue === 'en'
            ? ['', 'one', 'two', 'three', 'four', 'five', 'six'][c.longueur]
            : ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six'][c.longueur];
          assert.ok(tri.caption.toLowerCase().includes(mot),
            `${texte}/${langue} : « ${tri.caption} » doit dire des séries de ${mot}`);
        }
      }
    }
    if (texte === '666') assert.ok(vus > 0, 'le cas de référence doit trier quelque part');
  }
});

/**
 * ★ « LES 6 SONT MAJORITAIRES » NE SE DIT QUE LORSQUE C'EST VRAI.
 *
 * La formulation demandée par l'auteur pour l'étape 14 de
 * `#sce!3.1:tca+mpy+mr9#3A8ev…` ARGUMENTE au lieu de désigner — et une rhétorique
 * qui s'appuie sur un fait faux n'est plus une rhétorique, c'est une erreur de
 * Registre. Le drapeau `recolte.majoritaire` est donc recoupé ici contre ce que
 * la scène montre : ce qu'on surligne, ce qu'on fait tomber.
 */
test('★ la majorité annoncée est celle qu’on voit tomber', () => {
  for (const texte of ['666', '777', '111', '13']) {
    const c = lireCible(texte);
    const r = moteur.resoudre('hope-hope-hope.fr', { cible: texte });
    for (const a of r.approches) {
      const sc = moteur.scenarioDe(a, { saisie: 'hope-hope-hope.fr', cible: c });
      const tri = sc.steps.find((s) => s.recolte);
      if (!tri) continue;
      const gardes = tri.ops.find((o) => o.op === 'highlight').targets.length;
      const jetes = tri.ops.find((o) => o.op === 'drop').targets.length;
      if (tri.recolte.majoritaire) {
        assert.ok(c.homogene, `${texte} : une cible hétérogène n’a pas de chiffre majoritaire`);
        assert.ok(gardes * 2 > gardes + jetes,
          `${texte} : ${a.codes} annonce une majorité sur ${gardes}/${gardes + jetes}`);
        assert.ok(tri.title.includes('majoritaires'), `${texte} : ${tri.title}`);
      } else {
        assert.ok(!tri.title.includes('majoritaires'),
          `${texte} : ${a.codes} dit la majorité sans la porter`);
      }
    }
  }
});

test('★ hors de 666, aucune corne ne pousse', () => {
  // Les cornes sont l'emblème du 666, et le contrôle croisé du moteur visuel
  // n'accepte que trois 6 (`visuel/scenario.js`). Une cible sans emblème passe
  // en registre sobre — c'est ce que `construireScenario` applique lui-même,
  // même quand aucun lien n'a été lu.
  for (const texte of ['111', '13', '007', '000']) {
    const r = moteur.resoudre('hope-hope-hope.fr', { cible: texte });
    for (const a of r.approches) {
      const sc = moteur.scenarioDe(a, {
        saisie: 'hope-hope-hope.fr', cible: lireCible(texte), registre: 'scenique',
      });
      assert.equal(sc.registre, 'sobre', `${texte} : le registre se replie`);
      const cornes = sc.steps.flatMap((s) => s.ops).filter((o) => o.op === 'horns');
      assert.equal(cornes.length, 0, `${texte} : ${a.codes}`);
    }
  }
});

test('★ sixDuChemin et compterMoisson lisent la SUITE, pas un compte', () => {
  const c = lireCible('007');
  const faux = (valeurs) => ({
    ops: [], cout: 0, valeur: null,
    etats: [{ type: 'TOKENS', valeur: valeurs.map(() => 'x'), traces: [] },
      { type: 'NUMS', valeur: valeurs, traces: [] }],
  });
  const part = (valeurs, d, f) => ({
    fragment: { intervalles: [[d, f]], offset: d, longueur: f - d, texte: 'x' },
    chemin: faux(valeurs),
  });
  // Deux portées qui rapportent « trois chiffres utiles » chacune, mais dont la
  // concaténation n'écrit `007` que deux fois — pas quatre.
  const parts = [part([0, 0, 7], 0, 3), part([0, 0, 7], 3, 6)];
  assert.deepEqual(sixDuChemin(parts[0].chemin, c).chiffres, [0, 0, 7]);
  assert.equal(compterMoisson(parts, c).series, 2);
  // Et l'ORDRE compte : `7 0 0` puis `7 0 0` n'écrit qu'un seul 007 — les deux
  // portées rapportent autant de chiffres utiles et n'en écrivent que la moitié.
  const desordre = [part([7, 0, 0], 0, 3), part([7, 0, 0], 3, 6)];
  assert.equal(compterMoisson(desordre, c).series, 1);
});

test('★ le seuil de deux séries SUIT LA CIBLE — et il n’a jamais dit pourquoi il valait 2', () => {
  /* ★ « Une seule série, c'est un 666 ordinaire » : la phrase est exacte, et
     c'est ce qui la rend LOCALE. Elle vaut parce que sur une cible homogène,
     une portée qui rapporte `longueur` chiffres utiles écrit la cible à elle
     seule — le GROUPEMENT le fait déjà, en un geste. Sur une cible mêlée,
     l'argument tombe : l'ordre des chiffres fait qu'une seule série est DÉJÀ
     l'ouvrage conjoint de plusieurs portées, c'est-à-dire ce que le mode existe
     pour montrer. */
  const faux = (valeurs) => ({
    ops: [], cout: 0, valeur: null,
    etats: [{ type: 'TOKENS', valeur: valeurs.map(() => 'x'), traces: [] },
      { type: 'NUMS', valeur: valeurs, traces: [] }],
  });
  const part = (valeurs, d, f) => ({
    fragment: { intervalles: [[d, f]], offset: d, longueur: f - d, texte: 'x' },
    chemin: faux(valeurs),
  });

  // Homogène : le seuil ne bouge PAS. Deux portées, une seule série → refus,
  // exactement comme avant la généralisation.
  const six = [part([6, 6], 0, 2), part([6], 2, 3)];
  assert.equal(compterMoisson(six, CIBLE_DEFAUT), null, '666 : une série ne fait pas moisson');
  assert.equal(compterMoisson([part([6, 6, 6], 0, 3), part([6, 6, 6], 3, 6)], CIBLE_DEFAUT).series, 2);
  // …et `111`, `777`, `000` sont homogènes eux aussi : mêmes règles, même seuil.
  assert.equal(compterMoisson([part([1, 1], 0, 2), part([1], 2, 3)], lireCible('111')), null);

  // Mêlée : une série suffit, et elle vaut d'être montrée.
  const treize = [part([1], 0, 1), part([3], 1, 2)];
  assert.equal(compterMoisson(treize, lireCible('13')).series, 1,
    'deux portées, chacune un chiffre, et la cible écrite : c’est une moisson');
});

/* ═══════════ 9. Une cible HÉTÉROGÈNE et LONGUE : le motif ════════════════
   ★ Le cas qui a ouvert le chantier, tel que l'auteur l'a envoyé :
   `#c01111984!#7boAPhRQaJv3r4zEtw6VY8rtE7Vi65vVA` — une date de naissance sur
   « Henri Prunelle Chochotte » — ne rendait RIEN. Ce n'était pas une panne :
   c'était l'objectif de la moisson qui n'était pas le bon.

   Trois biais de COMPTAGE se cachaient l'un derrière l'autre, et chacun est
   inoffensif sur une cible homogène — où compter les chiffres utiles et écrire
   la cible sont la même chose à la division près :

     1. la MATIÈRE — `vecteursDeSix` coupait ses vingt candidats par compte, et
        sur `01111984` les vingt premiers étaient tous riches en 1 : aucun 0,
        aucun 4, aucun 8 ne franchissait le plafond ;
     2. le CHOIX — `meilleureMoisson` maximisait la somme des chiffres utiles :
        elle retenait vingt-deux 1 pour ZÉRO série ;
     3. le SEUIL — `compterMoisson` exigeait DEUX séries, ce qui revenait à
        demander seize chiffres à leur place pour accepter d'en montrer huit.

   Ces tests tiennent la correction des trois, et ils tiennent aussi ce qu'elle
   ne doit pas déplacer : sur une cible homogène, rien ne bouge. */

test('★ le cas qui ouvre le chantier — `01111984` sur « Henri Prunelle Chochotte »', () => {
  const c = lireCible('01111984');
  const r = moteur.resoudre('Henri Prunelle Chochotte', { cible: c });
  assert.ok(r.approches.length, 'une date de naissance doit être atteignable');
  for (const a of r.approches) {
    // ★ Le contrôle qui compte : la voie ÉCRIT la cible, chiffre par chiffre et
    //   dans l'ordre. Un compte de chiffres utiles ne prouverait rien ici —
    //   c'est précisément l'erreur qu'on vient de corriger.
    const suite = a.parts.flatMap((p) => sixDuChemin(p.chemin, c).chiffres);
    assert.ok(seriesDe(suite, c).length >= 1,
      `${a.mode} : la suite récoltée doit écrire ${c.texte} — ${suite.join('')}`);
    assert.equal(verdictDe(a), verdict(a.series || 1, c));
    assert.ok(a.url.includes('c01111984!'), a.url);
  }
});

test('★ une voie de cible hétérogène se REJOUE depuis son lien', () => {
  // §4.3 : un lien partagé rend la même démonstration, cible comprise. C'est
  // aussi ce qui vérifie que `rejouer` résout les codes SUR LA CIBLE DU LIEN —
  // six opérateurs ne font pas la même chose selon ce qu'on cherche.
  const r = moteur.resoudre('Henri Prunelle Chochotte', { cible: '01111984' });
  for (const a of r.approches) {
    const rejoue = moteur.rejouer(lire(a.url));
    assert.ok(rejoue.ok, `${a.url} : ${rejoue.raison}`);
    assert.equal(rejoue.approche.cible.texte, '01111984');
    assert.equal(rejoue.approche.series, a.series, 'le compte de séries est redéduit, pas transporté');
    assert.equal(verdictDe(rejoue.approche), verdictDe(a));
  }
});

test('★ maximiser un chiffre n’est PAS écrire un motif — la mesure', () => {
  /* Le cœur du volet : sur une cible mêlée, les deux objectifs divergent, et
     l'ancien choisissait le mauvais. On le montre sans nommer aucun programme —
     on compare ce que les deux LECTURES rapportent. */
  const c = lireCible('01111984');
  const r = moteur.resoudre('Henri Prunelle Chochotte', { cible: c });
  const moissons = r.approches.filter((a) => a.mode === 'MOISSON');
  assert.ok(moissons.length, 'la moisson est le seul mode capable d’enchaîner des portées');
  for (const a of moissons) {
    const suite = a.parts.flatMap((p) => sixDuChemin(p.chemin, c).chiffres);
    const utiles = indexUtiles(suite, c).length;
    const ecrits = seriesDe(suite, c).length * c.longueur;
    assert.ok(ecrits >= 1, 'la voie écrit la cible');
    // ★ Et voilà la démonstration en une ligne : la voie retenue récolte des
    //   chiffres utiles qu'elle n'écrit PAS. Un algorithme qui maximise
    //   `utiles` ne trouverait jamais celle-ci — il prendrait la lecture qui en
    //   récolte davantage et n'en écrit aucun.
    assert.ok(utiles >= ecrits, `${utiles} récoltés, ${ecrits} écrits`);
  }
});

test('★ NON-RÉGRESSION — une cible homogène ne connaît PAS la moisson de motif', () => {
  /* La variante « motif » n'est pas calculée sur une cible homogène, et il ne
     faut pas qu'elle le soit : `666`, `111`, `777` et `000` y ont un seul
     chiffre utile, les deux objectifs y sont le même, et une seconde variante
     ne rendrait que des doublons — ou pire, un classement différent.

     On ne teste pas l'absence d'un appel (invisible), on teste ce qu'elle
     garantit : le seuil de deux séries tient, donc aucune moisson à une seule
     série n'apparaît jamais sur une cible homogène. */
  for (const texte of ['666', '111', '000']) {
    const c = lireCible(texte);
    for (const saisie of ['hope-hope-hope.fr', 'Millicent Billette', 'Henri Prunelle Chochotte']) {
      const r = moteur.resoudre(saisie, { cible: c });
      for (const a of r.approches) {
        if (a.mode !== 'MOISSON') continue;
        assert.ok(a.series >= 2,
          `${saisie} / ${texte} : une moisson à ${a.series} série sur une cible homogène`);
      }
    }
  }
});

/**
 * ★ **`mad` ET `mrd` TRAVAILLENT-ILS POUR AUTRE CHOSE QUE 666 ? — la mesure.**
 *
 * > « mad ou mrd sont-ils réellement capables d'optimiser pour autre chose que
 * >   666 ? Ils ont un gros potentiel pour arriver à produire des séquences sur
 * >   mesure. S'ils ne sont pas prêts pour ça, il va falloir les améliorer. »
 * >   (l'auteur)
 *
 * ★ **OUI, ET PAR CONSTRUCTION.** Les deux sont déclarés `selonLaCible` et
 *   lisent `butsDuPaquet(visee)` : ce qu'un paquet a le droit de viser est
 *   l'ALPHABET DE LA CIBLE, augmenté du 9 quand — et seulement quand — c'est un
 *   6 qu'on cherche et qu'un demi-tour peut le rendre. Sur une cible qui ne
 *   demande que des zéros, ils ne sont même pas construits.
 *
 * Le témoin est « Sarah Kerrigan », personnage de StarCraft, visant la date de
 * sortie du jeu — 31 mars 1998. Il a été choisi pour éprouver le moteur LOIN de
 * son terrain : huit chiffres, cinq valeurs distinctes, un zéro en tête de
 * groupe, et pas un seul 6.
 *
 * ⚠️ **ET IL MONTRE QUE LA LIMITE N'EST PAS DANS `mad` NI DANS `mrd`.** Mesuré :
 *
 *     Sarah Kerrigan → 98         12 voies · mrd 6
 *     Sarah Kerrigan → 998        12 voies · mrd 7 · mad 1
 *     Sarah Kerrigan → 1998       12 voies · mrd 6 · mad 1
 *     Sarah Kerrigan → 31998       2 voies · mrd 2
 *     Sarah Kerrigan → 031998      0 voie
 *     Sarah Kerrigan → 31031998    0 voie  (même à fouille 4, douze secondes)
 *     Sarah Kerrigan Queen of Blades → 31031998   1 voie
 *
 *   Les deux opérateurs sont donc largement employés hors 666 — jusqu'à sept
 *   voies sur douze —, et ce qui s'épuise à partir de six chiffres est la
 *   MATIÈRE : treize caractères ne suffisent pas à écrire huit chiffres imposés
 *   dans l'ordre. Trente caractères y suffisent. Améliorer `mad` ou `mrd` ne
 *   changerait rien à cette arithmétique-là.
 */
test('★ témoin Kerrigan — `mad` et `mrd` servent des cibles qui n’ont rien de 666', () => {
  const r = moteur.resoudre('Sarah Kerrigan', { cible: '1998' });
  assert.ok(r.approches.length >= 4, `${r.approches.length} voies vers 1998`);
  const emploie = (code) => r.approches.filter(
    (a) => new RegExp(`(^|[+,;:])${code}([+,;]|$)`).test(a.codes)).length;
  // La cible `1998` ne contient aucun 6 : si ces deux-là ne savaient viser que
  // lui, ils seraient absents. Ils sont au contraire majoritaires.
  assert.ok(emploie('mrd') >= 1, '`mrd` ne sert aucune voie vers 1998');
  assert.ok(emploie('mrd') + emploie('mad') >= 2,
    '`mad` et `mrd` réunis ne servent qu’une voie vers 1998');
  for (const a of r.approches) assert.equal(a.cible.texte, '1998');
});

test('★ témoin Kerrigan — la limite est la MATIÈRE, pas l’opérateur', () => {
  /* Ce test échouerait si le moteur se mettait à rendre des voies là où il n'y
     a pas de quoi les écrire — ou, à l'inverse, s'il perdait celles qu'il
     trouve avec assez de matière. Les deux bornes se tiennent, et c'est le
     couple qui a du sens : ni l'une ni l'autre seule ne dit où est le mur. */
  const court = moteur.resoudre('Sarah Kerrigan', { cible: '31031998' });
  assert.equal(court.approches.length, 0,
    'treize caractères suffiraient à écrire huit chiffres imposés ?');
  const long = moteur.resoudre('Sarah Kerrigan Queen of Blades', { cible: '31031998' });
  assert.ok(long.approches.length >= 1,
    'trente caractères ne suffisent plus à écrire la date de sortie de StarCraft');
  for (const a of long.approches) assert.equal(a.cible.texte, '31031998');
});
