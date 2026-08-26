/** Le RÉGISSEUR — ce qui l'empêche de scintiller.
 *
 *  Tout est vérifiable sans navigateur : la décision est une fonction pure de
 *  l'état et de la durée de la dernière image. C'est délibéré — un régisseur
 *  qu'on ne pourrait juger qu'à l'œil se réglerait à l'aveugle, et c'est
 *  précisément ce qui a produit le défaut que ces tests gardent.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REGLAGES, MARGE_POUR_MONTER, etatInitial, reglerLeFeu,
} from '../qualite.js';

/** Déroule `n` images dont la durée peut dépendre de l'état. */
function derouler(duree, n, reglages = REGLAGES) {
  let etat = etatInitial(reglages);
  const suite = [etat.ampleur];
  for (let i = 0; i < n; i++) {
    etat = reglerLeFeu(etat, typeof duree === 'function' ? duree(etat, i) : duree, reglages);
    suite.push(etat.ampleur);
  }
  return { etat, suite };
}

const paliers = (suite) => suite.filter((v, i) => v !== suite[i - 1]);

/* ═══════════════════ 1. LE DÉFAUT QUI A TOUT DÉCLENCHÉ ══════════════════ */

test('★★ régisseur — il ne scintille pas quand ses propres changements coûtent cher', () => {
  /* « Le feu semble s'embraser puis, par scintillement, sauter à plus petit
     puis reprendre… bref, les ajustements selon les performances sont trop
     brutaux » (l'auteur).

     La cause était une boucle qui se mordait la queue : écrire l'ampleur force
     un nouveau tramage des flous, donc l'image SUIVANTE est lente — non parce
     que la machine peine, mais parce qu'on vient de lui demander de retramer.
     Le régisseur lisait cette lenteur comme un décrochage, retombait de trois
     marches, l'image d'après redevenait rapide, il remontait. D'où le battement.

     On simule exactement ça : une machine à 60 images/seconde dont CHAQUE
     changement coûte une image à 11 images/seconde, sous le plancher. */
  const { suite } = derouler((etat) => (etat.repos === REGLAGES.repos ? 90 : 16), 120);
  const marches = paliers(suite);

  // Aucune redescente : la suite doit être croissante d'un bout à l'autre.
  for (let i = 1; i < marches.length; i++) {
    assert.ok(marches[i] > marches[i - 1],
      `l’ampleur retombe (${marches[i - 1]} → ${marches[i]}) : le régisseur scintille`);
  }
  assert.equal(marches[marches.length - 1], 1,
    'une machine rapide doit finir au sommet malgré le coût de ses propres marches');
});

test('★ régisseur — l’image qui suit un changement n’est jamais prise pour une mesure', () => {
  // C'est le mécanisme du test précédent, isolé.
  let etat = etatInitial();
  etat = reglerLeFeu(etat, 16);                    // sort du repos initial ? non : il décompte
  const apresChangement = { ...etatInitial(), repos: REGLAGES.repos, ampleur: 0.5 };
  const suite = reglerLeFeu(apresChangement, 500); // une image catastrophique
  assert.equal(suite.ampleur, 0.5, 'une image de repos ne doit rien décider');
  assert.equal(suite.repos, REGLAGES.repos - 1, 'et elle doit décompter le repos');
});

/* ══════════════════════ 2. LE BARÈME DE L'AUTEUR ═══════════════════════ */

test('régisseur — machine rapide : il monte d’une marche à la fois jusqu’au sommet', () => {
  const { suite } = derouler(16, 120);
  const marches = paliers(suite);
  assert.equal(marches[0], REGLAGES.depart, 'on part bas, c’est ce qui rend l’allumage bon marché');
  assert.equal(marches[marches.length - 1], 1);
  for (let i = 1; i < marches.length; i++) {
    const pas = Math.round((marches[i] - marches[i - 1]) * 100) / 100;
    assert.ok(pas > 0 && pas <= REGLAGES.pas + 1e-9,
      `marche de ${pas} : l’auteur a demandé 10 % à la fois`);
  }
});

test('régisseur — machine sous le plancher : il ne monte JAMAIS', () => {
  // 80 ms par image, soit 12,5 i/s : sous les 15 du plancher.
  const { suite } = derouler(80, 120);
  assert.deepEqual(paliers(suite), [REGLAGES.depart],
    'une machine qui ne tient pas le plancher ne doit rien recevoir de plus');
});

test('★ régisseur — la zone de repos : entre le plancher et son double, on ne touche à rien', () => {
  // 50 ms = 20 i/s : au-dessus du plancher (15), sous son double (30).
  const { suite } = derouler(50, 120);
  assert.deepEqual(paliers(suite), [REGLAGES.depart],
    'viser le plancher tout juste ferait osciller autour de lui');
  assert.equal(MARGE_POUR_MONTER, 2, 'la marge du « 2× » de l’auteur');
});

/* ════════════════ 3. IL SE TAIT, ET IL NE SE RÉVEILLE QUE FRANCHEMENT ═══ */

test('★★ régisseur — l’ampleur se FIGE une fois la calibration close', () => {
  /* Un feu dont la taille suivrait indéfiniment l'humeur de la machine
     respirerait au mauvais rythme. Le régisseur cherche son palier pendant la
     germination, où ses marches se confondent avec la pousse des flammes, puis
     il se tait. */
  const { etat } = derouler(16, 400);
  assert.equal(etat.fige, true, 'la calibration doit se clore');
  assert.ok(etat.ecoule >= REGLAGES.fenetreMs);

  // Une fois figé, même une machine devenue très rapide ne fait plus monter.
  let apres = { ...etat, ampleur: 0.5, fige: true, repos: 0 };
  for (let i = 0; i < 200; i++) apres = reglerLeFeu(apres, 4);
  assert.equal(apres.ampleur, 0.5, 'figé veut dire figé : plus de montée');
});

test('★ régisseur — le guet ne descend que sur un décrochage FRANC et DURABLE', () => {
  const base = { ...etatInitial(), fige: true, repos: 0, ampleur: 0.8 };

  // Une seule image lente : un accident, on ne bouge pas.
  let e = reglerLeFeu(base, 200);
  assert.equal(e.ampleur, 0.8, 'une image lente est un accident, pas un aveu');

  // Assez d'images lentes d'affilée : une marche, une seule.
  e = base;
  for (let i = 0; i < REGLAGES.gardeImages; i++) e = reglerLeFeu(e, 200);
  assert.ok(Math.abs(e.ampleur - 0.7) < 1e-9,
    `après ${REGLAGES.gardeImages} images sous le plancher, il doit descendre d’UNE marche`);

  // Et le compteur se remet à zéro dès qu'une image repasse au-dessus.
  let f = base;
  for (let i = 0; i < REGLAGES.gardeImages - 1; i++) f = reglerLeFeu(f, 200);
  f = reglerLeFeu(f, 16);
  assert.equal(f.manquements, 0, 'une image saine doit effacer l’ardoise');
});

/* ═════════════════════════ 4. LE FICHIER DE RÉGLAGE ═════════════════════ */

test('★ régisseur — le plancher est un réglage, et il gouverne vraiment', () => {
  // « 15 réglable en fichier de config pour que je puisse le monter à 30 ou le
  // descendre à 10 selon ce qui me semble pertinent » (l'auteur).
  assert.equal(REGLAGES.plancherIps, 15, 'le défaut annoncé à l’auteur');

  // À 30, une machine à 50 i/s ne doit plus avoir le droit de monter (50 < 60).
  const exigeant = { ...REGLAGES, plancherIps: 30 };
  const { suite: dur } = derouler(20, 120, exigeant);
  assert.deepEqual(paliers(dur), [REGLAGES.depart],
    'monter le plancher doit appauvrir le feu, sinon le réglage ne sert à rien');

  // À 10, la même machine grimpe au sommet.
  const permissif = { ...REGLAGES, plancherIps: 10 };
  const { suite: doux } = derouler(20, 200, permissif);
  assert.equal(paliers(doux)[paliers(doux).length - 1], 1,
    'descendre le plancher doit enrichir le feu');
});
