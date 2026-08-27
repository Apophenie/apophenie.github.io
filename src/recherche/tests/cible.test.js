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
import { operateursPourCible, operateursExplorables, OPERATEURS_LIES_A_666 } from '../bfs.js';
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
  for (const mauvais of ['', '  ', 'six', '6,6', '6.6', '-6', '6 6', '1234567', null, undefined, {}]) {
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
  const r = lire(`#c1234567!nd#${B58}`);
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

test('★ NON-RÉGRESSION — les 101 opérateurs restent explorables pour 666', () => {
  const tous = operateursExplorables(catalogue);
  assert.deepEqual(
    operateursPourCible(catalogue, normaliserCible('666')).map((o) => o.code),
    tous.map((o) => o.code),
  );
  // …et les cinq opérateurs écrits autour du 6 sortent dès qu'on vise ailleurs.
  const autres = operateursPourCible(catalogue, normaliserCible('111')).map((o) => o.id);
  for (const id of OPERATEURS_LIES_A_666) {
    assert.ok(tous.some((o) => o.id === id), `${id} existe au catalogue`);
    assert.ok(!autres.includes(id), `${id} ne s’explore pas hors de 666`);
  }
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
  // Et l'ordre compte : `7 0 0` puis `7 0 0` n'écrit qu'un seul 007.
  const desordre = [part([7, 0, 0], 0, 3), part([7, 0, 0], 3, 6)];
  assert.equal(compterMoisson(desordre, c), null, 'une seule série, ce n’est pas une moisson');
});
