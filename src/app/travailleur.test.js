/** Le lanceur de recherche en fond — `node --test src/app/travailleur.test.js`.
 *
 *  Ce qui se vérifie ici n'est PAS le navigateur : ni `Worker`, ni `Blob`, ni
 *  `file://` n'existent sous Node, et prétendre les tester serait une doublure
 *  qui se testerait elle-même. Ce qui se vérifie est ce qui a réellement cassé
 *  ailleurs dans ce dépôt : le CÂBLAGE. Qu'un travailleur mort-né retombe sur le
 *  fil principal au lieu de laisser la page en suspens, que les messages soient
 *  distribués à la bonne recherche, qu'une recherche coiffée ne repeigne pas
 *  par-dessus la suivante.
 *
 *  ⚠️ Le vrai chemin navigateur, lui, a été mesuré à la main — le relevé est en
 *  tête de `src/app/travailleur.js`, avec les trois modes constatés
 *  (`fichier-unique` en `file://`, `sources` en dev, `tranches` sans Worker). */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creerRechercheEnFond, ouvrirTravailleur } from './travailleur.js';
import { creerMoteur, creerCanal } from '../recherche/index.js';
import { CATALOGUE } from '../moteur/catalogue.js';

const moteur = creerMoteur(CATALOGUE);
const canalLocal = (recevoir) => creerCanal(moteur, recevoir);

/** Un travailleur de doublure : il rend ce qu'on lui dit de rendre, quand on
 *  lui dit de le rendre. Aucun calcul — c'est le transport qu'on éprouve. */
function travailleurFactice({ repondAuPing = true, jette = false } = {}) {
  const worker = {
    recus: [],
    onmessage: null,
    onerror: null,
    arrete: false,
    terminate() { this.arrete = true; },
    postMessage(m) {
      this.recus.push(m);
      if (jette) { queueMicrotask(() => this.onerror({ message: 'boum' })); return; }
      if (m.type === 'ping' && repondAuPing) {
        queueMicrotask(() => this.onmessage({ data: { type: 'pret' } }));
      }
      if (m.type === 'resoudre') {
        queueMicrotask(() => {
          this.onmessage({ data: {
            type: 'avancement', generation: m.generation, fraction: 0.5,
            fragments: 1, fragmentsTotal: 2, travail: 10, travailTotal: 100,
          } });
          this.onmessage({ data: {
            type: 'resultat', generation: m.generation, saisie: m.saisie,
            cible: m.cible || '666', approches: [{ rang: 1, url: '#faux' }],
          } });
        });
      }
    },
  };
  return { worker, forme: 'fichier-unique' };
}

test('sans Worker du tout, le lanceur ne fabrique rien et ne jette pas', () => {
  // Sous Node, `Worker` n'est pas une variable globale : c'est exactement la
  // situation d'un navigateur qui le refuse, et le lanceur doit répondre `null`
  // plutôt que de laisser passer une exception jusqu'à l'amorçage.
  assert.equal(ouvrirTravailleur(), null);
});

test('un travailleur vivant sert les recherches, avancement compris', async () => {
  const fond = creerRechercheEnFond({ ouvrir: travailleurFactice });
  assert.equal(await fond.pret() !== null, true);
  assert.equal(fond.mode(), 'fichier-unique');

  const avances = [];
  const r = await fond.chercher('hope', null, { surAvancement: (a) => avances.push(a) });
  assert.equal(r.type, 'resultat');
  assert.equal(r.saisie, 'hope');
  assert.equal(avances.length, 1);
  assert.equal(avances[0].fraction, 0.5);
});

test('la cible traverse le transport telle qu’on la lui donne', async () => {
  const fond = creerRechercheEnFond({ ouvrir: travailleurFactice });
  const r = await fond.chercher('hope', '111');
  assert.equal(r.cible, '111');
});

test('un travailleur qui ne répond jamais est abandonné, et le repli prend la suite', async () => {
  const fond = creerRechercheEnFond({
    ouvrir: () => travailleurFactice({ repondAuPing: false }),
    canalLocal,
    // Le délai est un réglage justement pour que ce test ne dure pas trois
    // secondes ; la valeur de production est dans `src/app/travailleur.js`.
    delaiNaissanceMs: 30,
  });
  await fond.pret();
  assert.equal(fond.mode(), 'tranches', 'le repli local doit prendre la main');
  const r = await fond.chercher('hope', null);
  assert.equal(r.type, 'resultat');
  assert.ok(r.approches.length >= 1, 'le repli cherche pour de bon, il ne fait pas semblant');
});

test('un travailleur qui échoue au chargement bascule sur le repli sans attendre', async () => {
  const fond = creerRechercheEnFond({
    ouvrir: () => travailleurFactice({ jette: true }),
    canalLocal,
    delaiNaissanceMs: 5000,   // sciemment long : c'est `onerror` qui doit trancher
  });
  await fond.pret();
  assert.equal(fond.mode(), 'tranches');
});

test('un lanceur qui n’a ni travailleur ni moteur local le dit, au lieu de faire attendre', async () => {
  const fond = creerRechercheEnFond({ ouvrir: () => null });
  await fond.pret();
  assert.equal(fond.mode(), 'aucun');
  assert.equal(await fond.chercher('hope', null), null);
});

test('le repli local rend un avancement, comme le travailleur — c’est le même canal', async () => {
  const fond = creerRechercheEnFond({ ouvrir: () => null, canalLocal });
  await fond.pret();
  assert.equal(fond.mode(), 'tranches');
  const avances = [];
  const r = await fond.chercher('Le chat dort sur le tapis', null, {
    surAvancement: (a) => avances.push(a),
  });
  assert.equal(r.type, 'resultat');
  assert.ok(avances.length >= 2, `attendu plusieurs paliers, reçu ${avances.length}`);
  assert.ok(avances.every((a) => a.fraction > 0 && a.fraction <= 1));
});

test('un travailleur qui meurt EN COURS de recherche réveille la demande au lieu de la geler', async () => {
  // Le cas le plus traître : le travailleur est né vivant, la page lui a confié
  // une recherche, et il s'arrête. Sans réveil, la page d'attente resterait à
  // l'écran indéfiniment, jauge figée, sans le moindre message.
  const { worker, forme } = travailleurFactice();
  const mourant = {
    forme,
    worker: {
      ...worker,
      postMessage(m) {
        worker.recus.push(m);
        if (m.type === 'ping') queueMicrotask(() => this.onmessage({ data: { type: 'pret' } }));
        if (m.type === 'resoudre') queueMicrotask(() => this.onerror({ message: 'mort subite' }));
      },
      terminate() {},
    },
  };
  const fond = creerRechercheEnFond({ ouvrir: () => mourant });
  await fond.pret();
  assert.equal(fond.mode(), 'fichier-unique');
  await assert.rejects(() => fond.chercher('hope', null), /travailleur/);
});

test('une recherche coiffée par une plus récente se retire sans peindre', async () => {
  const fond = creerRechercheEnFond({ ouvrir: () => null, canalLocal });
  await fond.pret();
  const vieille = fond.chercher('Le chat dort sur le tapis rouge', null);
  const neuve = fond.chercher('hope', null);
  assert.equal(await vieille, null, 'la demande dépassée rend null, jamais un résultat périmé');
  assert.equal((await neuve).saisie, 'hope');
});
