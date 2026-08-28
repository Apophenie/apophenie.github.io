/** La recherche qui se voit — `node --test src/recherche/tests/progression.test.js`.
 *
 *  Ce que ces tests gardent, dans l'ordre d'importance :
 *
 *   1. **le découpage ne change pas le résultat.** C'est la condition de tout
 *      le reste : si chercher en tranches donnait une autre liste que chercher
 *      d'un trait, la jauge serait payée par une entorse au déterminisme (§4.4)
 *      et le prix serait trop élevé ;
 *   2. **l'avancement ne ment pas.** Il ne recule pas, il ne dépasse pas 1, et
 *      il vient d'un COMPTE — des fragments et du travail — jamais d'une
 *      estimation de durée ;
 *   3. **le temps rendu à la page n'est pas compté comme du temps de
 *      recherche.** Sans cette correction, une recherche polie déclencherait
 *      son propre filet de sécurité et se tronquerait pour avoir laissé peindre. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creerMoteur, creerCanal, avancementDe } from '../index.js';
import { deroulerParTranches, rendreLaMain } from '../tranches.js';
import { installerTravailleur, dansUnTravailleur } from '../travailleur.js';
import { catalogue } from './_catalogue.js';

/** Une saisie qui donne PLUSIEURS fragments : sans quoi il n'y a qu'un seul
 *  palier d'avancement et rien à observer. */
const PHRASE = 'Le chat dort sur le tapis rouge';

/* ═══════════════ 1. Le découpage ne change pas le résultat ═══════════════ */

test('progressif — la liste rendue est exactement celle de la version synchrone', async () => {
  const m = creerMoteur(catalogue);
  // ⚠️ Le filet temporel est débranché DES DEUX CÔTÉS : c'est la seule source
  //    d'entropie du moteur, et la comparaison n'aurait aucun sens si l'un des
  //    deux pouvait se tronquer sur un coup de charge de la machine.
  const options = { filetTemporel: false };
  const droit = m.resoudre(PHRASE, options);
  const tranche = await m.resoudreProgressif(PHRASE, options);
  const signature = (r) => (r.approches || []).map((a) => `${a.rang}:${a.url}:${a.score}`);
  assert.deepEqual(signature(tranche), signature(droit));
  assert.deepEqual(
    (tranche.fragments || []).map((f) => f.url),
    (droit.fragments || []).map((f) => f.url),
  );
  assert.equal(tranche.tronque, droit.tronque);
});

test('progressif — une saisie vide ou trop longue rend la main sans jamais s’arrêter', async () => {
  const m = creerMoteur(catalogue);
  const vide = await m.resoudreProgressif('');
  assert.equal(vide.vide, true);
  const trop = await m.resoudreProgressif('x'.repeat(5000));
  assert.ok(trop.avertissement, 'une saisie trop longue reste annoncée');
});

/* ═══════════════════ 2. L'avancement ne ment pas ════════════════════════ */

test('avancementDe — le maximum des deux rapports, borné à 1', () => {
  // Sur une saisie courte, ce sont les FRAGMENTS qui décident.
  assert.equal(avancementDe({
    fragments: 1, fragmentsTotal: 2, travail: 1000, travailTotal: 1000000,
  }).fraction, 0.5);
  // Sur une saisie longue, c'est le TRAVAIL qui approche sa borne en premier —
  // et la jauge doit le dire, sinon elle irait tranquillement jusqu'à 20 % puis
  // sauterait à la fin.
  assert.equal(avancementDe({
    fragments: 4, fragmentsTotal: 20, travail: 900000, travailTotal: 1000000,
  }).fraction, 0.9);
  // Jamais au-delà de 1, même si une borne est dépassée.
  assert.equal(avancementDe({
    fragments: 3, fragmentsTotal: 2, travail: 2000000, travailTotal: 1000000,
  }).fraction, 1);
  // Un dénominateur nul ne produit ni NaN ni Infinity.
  const nul = avancementDe({ fragments: 0, fragmentsTotal: 0, travail: 0, travailTotal: 0 });
  assert.equal(nul.fraction, 1);
});

test('progressif — l’avancement croît, reste dans [0, 1] et compte de vrais fragments', async () => {
  const m = creerMoteur(catalogue);
  const releves = [];
  await m.resoudreProgressif(PHRASE, {
    filetTemporel: false,
    surAvancement: (a) => releves.push(a),
    // Une tranche nulle force un retour à la boucle entre CHAQUE fragment :
    // c'est le pire cas de découpe, donc celui qu'il faut vérifier.
    trancheMs: 0,
  });
  assert.ok(releves.length >= 3, `attendu plusieurs paliers, reçu ${releves.length}`);
  let precedent = -1;
  for (const a of releves) {
    assert.ok(a.fraction >= precedent, `la jauge recule : ${precedent} → ${a.fraction}`);
    assert.ok(a.fraction >= 0 && a.fraction <= 1, `fraction hors bornes : ${a.fraction}`);
    assert.ok(a.fragments >= 1 && a.fragments <= a.fragmentsTotal,
      `${a.fragments} fragments sur ${a.fragmentsTotal}`);
    precedent = a.fraction;
  }
  const dernier = releves[releves.length - 1];
  assert.equal(dernier.fragments, dernier.fragmentsTotal,
    'tous les fragments annoncés ont été cherchés : la jauge doit finir pleine');
  assert.equal(dernier.fraction, 1);
});

test('progressif — la jauge n’atteint 100 % qu’au dernier fragment, jamais avant', async () => {
  // Le mensonge que ce test interdit : une barre pleine pendant qu'on calcule
  // encore. Il se produisait quand l'avancement rapportait le travail au seul
  // budget global, en oubliant la réserve des fragments garantis — la jauge
  // atteignait 100 % au onzième fragment sur seize, et continuait.
  const m = creerMoteur(catalogue);
  const releves = [];
  await m.resoudreProgressif('La numérologie est une science exacte, disent-ils', {
    filetTemporel: false, surAvancement: (a) => releves.push(a), trancheMs: 0,
  });
  const pleins = releves.filter((a) => a.fraction >= 1);
  assert.equal(pleins.length, 1, `la jauge est restée pleine ${pleins.length} paliers durant`);
  assert.equal(pleins[0], releves[releves.length - 1]);
});

test('progressif — le total annoncé ne compte pas deux fois le même fragment', async () => {
  const m = creerMoteur(catalogue);
  const releves = [];
  // « hope-hope-hope » propose le même texte sous plusieurs familles : le
  // dénominateur doit être celui des fragments DISTINCTS, sinon la jauge
  // s'arrête avant la fin sur exactement les saisies qui font le sel du site.
  await m.resoudreProgressif('hope-hope-hope.fr', {
    filetTemporel: false, surAvancement: (a) => releves.push(a), trancheMs: 0,
  });
  const dernier = releves[releves.length - 1];
  assert.equal(dernier.fragments, dernier.fragmentsTotal);
});

/* ═════════ 3. Le temps rendu n'est pas du temps de recherche ════════════ */

/** Une horloge de laboratoire : elle n'avance QUE lorsqu'on le lui dit. C'est ce
 *  qui permet d'attribuer chaque milliseconde à ce qui l'a consommée — ici, à la
 *  seule pause. Une horloge qui avancerait à chaque lecture mesurerait le nombre
 *  d'appels, pas le temps, et ne prouverait rien du tout. */
function horlogeCommandee() {
  const h = { t: 0 };
  h.maintenant = () => h.t;
  return h;
}

test('tranches — la pause est retranchée du filet temporel', async () => {
  // Deux secondes rendues à la page à chaque reprise : au troisième tour, un
  // filet naïf verrait six secondes passées et se déclencherait, alors que la
  // recherche n'a pas calculé une seule milliseconde.
  const h = horlogeCommandee();
  const m = creerMoteur(catalogue, { maintenant: h.maintenant });
  const releves = [];
  const r = await m.resoudreProgressif(PHRASE, {
    surAvancement: (a) => releves.push(a),
    trancheMs: 0,
    rendreLaMain: () => { h.t += 2000; return Promise.resolve(); },
  });
  assert.ok(releves.length >= 4, `attendu plusieurs pauses, reçu ${releves.length}`);
  assert.ok(h.t >= 8000, `l’horloge doit avoir dépassé le budget : ${h.t} ms`);
  assert.equal(r.tronqueTemps, false,
    'le filet ne doit pas se déclencher sur du temps qui n’a pas été passé à chercher');
});

test('tranches — sans la correction, le filet mordrait : la preuve par le contraire', () => {
  // Le MÊME dérouleur, la MÊME horloge, les MÊMES pauses de deux secondes — mais
  // conduit à la main, sans rien lui rendre de ce qu'on lui a pris (`next()` au
  // lieu de `next(pause)`). C'est ce test qui donne son sens au précédent : il
  // montre que la correction corrige quelque chose de réel, et pas un cas qui ne
  // se produirait jamais.
  const h = horlogeCommandee();
  const m = creerMoteur(catalogue, { maintenant: h.maintenant });
  const derouleur = m.deroulerResolution(PHRASE);
  let pas = derouleur.next();
  while (!pas.done) { h.t += 2000; pas = derouleur.next(); }
  assert.equal(pas.value.tronqueTemps, true);
});

test('rendreLaMain — rend une promesse qui se tient, et qui rend bien la main', async () => {
  let apres = false;
  const promesse = rendreLaMain().then(() => { apres = true; });
  assert.equal(apres, false, 'la reprise ne doit pas être synchrone');
  await promesse;
  assert.equal(apres, true);
});

test('deroulerParTranches — `annule` ferme le dérouleur et rend null', async () => {
  const m = creerMoteur(catalogue);
  const derouleur = m.deroulerResolution(PHRASE, { filetTemporel: false });
  const r = await deroulerParTranches(derouleur, { annule: () => true, trancheMs: 0 });
  assert.equal(r, null);
  assert.equal(derouleur.next().done, true, 'le générateur doit être clos');
});

/* ══════════════════════ 4. Le protocole de messages ═════════════════════ */

test('canal — traiterProgressif poste des avancements puis un résultat, tous clonables', async () => {
  const m = creerMoteur(catalogue);
  const envoyes = [];
  const canal = creerCanal(m, (msg) => { envoyes.push(msg); return msg; });
  await canal.traiterProgressif({ type: 'resoudre', generation: 3, saisie: PHRASE });

  const avancements = envoyes.filter((x) => x.type === 'avancement');
  const resultats = envoyes.filter((x) => x.type === 'resultat');
  assert.ok(avancements.length >= 2, 'au moins deux paliers d’avancement');
  assert.equal(resultats.length, 1);
  assert.equal(resultats[0].generation, 3);
  assert.ok(resultats[0].approches.length >= 1);
  for (const message of envoyes) {
    assert.equal(message.generation, 3);
    // Le protocole doit traverser un `postMessage` : rien d'autre ne compte.
    assert.doesNotThrow(() => structuredClone(message), `non clonable : ${message.type}`);
  }
});

test('canal — la cible voyage en clair et le moteur la vise vraiment', async () => {
  const m = creerMoteur(catalogue);
  const envoyes = [];
  const canal = creerCanal(m, (msg) => { envoyes.push(msg); return msg; });
  await canal.traiterProgressif({ type: 'resoudre', generation: 1, saisie: 'hope', cible: '111' });
  const resultat = envoyes.find((x) => x.type === 'resultat');
  assert.equal(resultat.cible, '111');
});

test('canal — une recherche coiffée par une plus récente ne poste jamais son résultat', async () => {
  const m = creerMoteur(catalogue);
  const envoyes = [];
  const canal = creerCanal(m, (msg) => { envoyes.push(msg); return msg; });
  const vieille = canal.traiterProgressif({ type: 'resoudre', generation: 1, saisie: PHRASE });
  // Une génération plus récente est demandée avant que la première ait fini :
  // c'est le cas de quelqu'un qui continue de taper.
  const neuve = canal.traiterProgressif({ type: 'resoudre', generation: 2, saisie: 'hope' });
  assert.equal(await vieille, null, 'la recherche périmée s’efface');
  await neuve;
  const resultats = envoyes.filter((x) => x.type === 'resultat');
  assert.equal(resultats.length, 1);
  assert.equal(resultats[0].generation, 2);
});

test('canal — traiter (synchrone) reste ce qu’il était, sans avancement', () => {
  const m = creerMoteur(catalogue);
  const envoyes = [];
  const canal = creerCanal(m, (msg) => { envoyes.push(msg); return msg; });
  const rep = canal.traiter({ type: 'resoudre', generation: 7, saisie: 'hope' });
  assert.equal(rep.type, 'resultat');
  assert.equal(envoyes.filter((x) => x.type === 'avancement').length, 0);
});

/* ═══════════════════════ 5. Le corps du travailleur ═════════════════════ */

/** Une portée de travailleur de doublure : juste ce que `installerTravailleur`
 *  touche — `postMessage` et `onmessage`. Aucun DOM, aucun Worker réel : ce qui
 *  est vérifié ici est le PROTOCOLE, pas le navigateur. */
function porteeFactice() {
  const recus = [];
  return {
    recus,
    postMessage: (m) => recus.push(m),
    onmessage: null,
    envoyer(message) { return this.onmessage({ data: message }); },
  };
}

/** Attend qu'une condition se réalise, en rendant la main entre deux essais.
 *  Le travailleur charge son catalogue de façon asynchrone : on ne peut pas
 *  savoir en combien de microtâches, seulement que ça finit par arriver. */
async function attendre(condition, essais = 400) {
  for (let i = 0; i < essais; i++) {
    if (condition()) return true;
    await rendreLaMain();
  }
  return condition();
}

test('travailleur — dansUnTravailleur ne se trompe pas de portée', () => {
  assert.equal(dansUnTravailleur(null), false);
  assert.equal(dansUnTravailleur({}), false);
  // Sous Node il n'existe pas de `WorkerGlobalScope` : le témoin doit répondre
  // « non » sans jeter, ce qui est exactement ce qu'on lui demande dans une page.
  assert.equal(dansUnTravailleur(globalThis), false);
});

test('travailleur — installé sur une portée, il annonce « pret » puis répond aux recherches', async () => {
  const portee = porteeFactice();
  assert.equal(installerTravailleur(portee), true);
  // Idempotent : deux installations poseraient deux `onmessage`, dont le second
  // effacerait le premier.
  assert.equal(installerTravailleur(portee), false);

  assert.ok(await attendre(() => portee.recus.some((m) => m.type === 'pret')),
    'le travailleur doit annoncer sa disponibilité');

  portee.envoyer({ type: 'resoudre', generation: 5, saisie: 'hope' });
  assert.ok(await attendre(() => portee.recus.some((m) => m.type === 'resultat')),
    'le travailleur doit répondre à une demande de recherche');

  const resultat = portee.recus.find((m) => m.type === 'resultat');
  assert.equal(resultat.generation, 5);
  assert.ok(resultat.approches.length >= 1);
  assert.doesNotThrow(() => structuredClone(resultat));
  assert.ok(portee.recus.some((m) => m.type === 'avancement'),
    'un travailleur qui ne dit rien pendant qu’il cherche ne vaut pas mieux qu’un fil bloqué');
});

test('travailleur — une demande arrivée avant le catalogue est mise en file, pas perdue', async () => {
  const portee = porteeFactice();
  installerTravailleur(portee);
  // Envoyée dans la foulée de l'installation : le catalogue n'est pas encore là.
  portee.envoyer({ type: 'resoudre', generation: 1, saisie: 'hope' });
  assert.ok(await attendre(() => portee.recus.some((m) => m.type === 'resultat')),
    'la demande doit être servie une fois le moteur prêt');
});

test('travailleur — une portée sans postMessage est refusée sans jeter', () => {
  assert.equal(installerTravailleur({}), false);
  assert.equal(installerTravailleur(null), false);
});
