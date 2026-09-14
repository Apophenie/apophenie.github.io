/** LES LISTES PROVISOIRES — `node --test src/recherche/tests/lents/provisoire.test.js`.
 *
 * > « Quand on cherche à énumérer les voies, afficher les résultats au fur et à
 * >   mesure serait une bonne idée, du moment que l'UI indique clairement que la
 * >   recherche est encore en cours et que le classement est provisoire. »
 * >   (l'autrice)
 *
 * Au-dessus du cran 0, la recherche est cumulative (`index.js ›
 * deroulerResolution`) : la liste de chaque cran inférieur est prête avant
 * celle du cran demandé, et elle y est contenue. `surListe` la montre.
 *
 * Ce que ces tests gardent, dans l'ordre d'importance :
 *
 *   1. **LA RÈGLE DES LIENS.** Tout lien affiché dans une liste provisoire se
 *      rejoue à l'identique — et c'est le lien que la même voie porte dans la
 *      liste finale. Une liste provisoire ne doit jamais produire un lien qui
 *      rejoue autre chose que ce qu'il montre, ni un lien qui disparaîtrait à
 *      la fin de la recherche ;
 *   2. **rien ne change au calcul** : la liste finale est la même, qu'on
 *      écoute les listes provisoires ou non ;
 *   3. le protocole : les listes ne voyagent que sur demande, avant le
 *      résultat, et se clonent.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creerMoteur, creerCanal, lire } from '../../index.js';
import { catalogue } from '../_catalogue.js';

/** Une recherche dont on garde les listes provisoires, dans l'ordre. */
function chercher(moteur, saisie, options) {
  const provisoires = [];
  const r = moteur.resoudre(saisie, {
    ...options,
    surListe: (liste, info) => provisoires.push({ liste, info }),
  });
  return { r, provisoires };
}

const signature = (liste) => liste.approches.map((a) => `${a.rang}:${a.urlSobre}:${a.score}:${a.suggestion ?? ''}`);

/* ═══════════════════════════ 1. La règle des liens ═══════════════════════ */

/* ★ Trois familles de voies : une cible chiffrée par défaut, une autre cible
     chiffrée (un marqueur de cible dans le lien, un seul registre), et un TEXTE
     visé — dont les liens portent en plus la relecture. */
const CAS = [
  ['hope', '666', 2],
  ['Donald Trump', '111', 1],
  ['Zerg', 'Zerg', 1],
];

test('★ provisoire — tout lien d’une liste provisoire se rejoue à l’identique, et la liste finale le porte', () => {
  for (const [saisie, cible, fouille] of CAS) {
    const moteur = creerMoteur(catalogue, { filetTemporel: false });
    const { r, provisoires: toutes } = chercher(moteur, saisie, { cible, fouille });
    // ★ Les listes de CRANS seulement : celles d'une relecture (cible texte) ont
    //   leur propre test, plus bas, et ne promettent pas d'être dans la finale.
    const provisoires = toutes.filter((p) => !p.info.intra);
    // ★ Une liste par cran inférieur, cran rapide (−1) compris.
    assert.equal(provisoires.length, fouille + 1, `${saisie} → ${cible} : une liste par cran inférieur`);
    const finales = new Map(r.approches.map((a) => [a.urlSobre, a]));
    for (const { liste, info } of provisoires) {
      const ou = `${saisie} → ${cible}, cran ${info.cran} sur ${info.fouille}`;
      assert.ok(liste.approches.length >= 1, `${ou} : une liste vide rendrait ce test muet`);
      // Le lien de la LISTE est celui de la liste demandée, pas d'une étape.
      assert.equal(liste.urlResultats, r.urlResultats, `${ou} : lien de la liste`);
      for (const a of liste.approches) {
        for (const url of [a.urlSobre, a.urlScenique]) {
          const rejeu = moteur.rejouer(lire(url));
          assert.equal(rejeu.ok, true, `${ou} : ${url} ne se rejoue pas (${rejeu.raison || ''})`);
          assert.equal(rejeu.approche.codes, a.codes, `${ou} : ${url} rejoue un autre programme`);
          assert.equal(rejeu.approche.score, a.score, `${ou} : ${url} rejoue un autre score`);
        }
        assert.equal(moteur.rejouer(lire(a.urlSobre)).approche.urlSobre, a.urlSobre, `${ou} : ${a.urlSobre} se réécrit`);
        const finale = finales.get(a.urlSobre);
        assert.ok(finale, `${ou} : ${a.urlSobre} n’est plus dans la liste finale`);
        assert.equal(finale.urlScenique, a.urlScenique, `${ou} : le lien scénique change à la fin`);
        assert.equal(finale.codes, a.codes, `${ou} : le même lien porte un autre programme à la fin`);
      }
    }
  }
});

/* ★ **LES LISTES D'UNE RELECTURE — la même règle des liens, sans la promesse
     d'inclusion.** Pour une cible texte, la liste se montre aussi relecture par
     relecture, DANS le cran. « Une voie affichée peut sortir de la liste finale,
     et son lien reste valide : c'est accepté pour ces provisoires-là, qui ne
     sont pas des crans » (l'autrice).
   ⚠️ La règle « figure dans la liste finale » NE S'APPLIQUE PAS à ces listes-là,
     et ce n'est pas un oubli : elle est vérifiée plus haut pour les listes de
     crans, et délibérément absente ici. Ce qui reste exigé, voie par voie : un
     lien qui se rejoue à l'identique — même programme, même score. */
test('★ provisoire — les listes d’une relecture montrent des liens qui se rejouent à l’identique', () => {
  const moteur = creerMoteur(catalogue, { filetTemporel: false });
  const { r, provisoires } = chercher(moteur, 'Zerg', { cible: 'Zerg' });
  const intra = provisoires.filter((p) => p.info.intra);
  assert.ok(intra.length >= 2, `attendu plusieurs relectures qui apportent, reçu ${intra.length}`);
  for (const { liste, info } of intra) {
    const ou = `Zerg → Zerg, cran ${info.cran}, relecture ${info.relecture}`;
    assert.ok(liste.approches.length >= 1, `${ou} : une liste vide ne se montre pas`);
    assert.equal(liste.urlResultats, r.urlResultats, `${ou} : lien de la liste`);
    for (const a of liste.approches) {
      for (const url of [a.urlSobre, a.urlScenique]) {
        const rejeu = moteur.rejouer(lire(url));
        assert.equal(rejeu.ok, true, `${ou} : ${url} ne se rejoue pas (${rejeu.raison || ''})`);
        assert.equal(rejeu.approche.codes, a.codes, `${ou} : ${url} rejoue un autre programme`);
        assert.equal(rejeu.approche.score, a.score, `${ou} : ${url} rejoue un autre score`);
      }
    }
  }
  // ★ Et elles ne changent rien à la liste finale.
  const sans = creerMoteur(catalogue, { filetTemporel: false }).resoudre('Zerg', { cible: 'Zerg' });
  assert.deepEqual(signature(r), signature(sans));
});

/* ═══════════════════ 2. Rien ne change au calcul ════════════════════════ */

test('provisoire — écouter les listes provisoires ne change pas la liste finale', () => {
  const avec = chercher(creerMoteur(catalogue, { filetTemporel: false }), 'hope', { fouille: 2 }).r;
  const sans = creerMoteur(catalogue, { filetTemporel: false }).resoudre('hope', { fouille: 2 });
  assert.deepEqual(signature(avec), signature(sans));
});

test('provisoire — chaque cran inférieur se montre, dans l’ordre, avant la liste demandée', () => {
  const moteur = creerMoteur(catalogue, { filetTemporel: false });
  const { provisoires } = chercher(moteur, 'hope', { fouille: 2 });
  assert.deepEqual(provisoires.map((p) => p.info),
    [{ cran: -1, fouille: 2 }, { cran: 0, fouille: 2 }, { cran: 1, fouille: 2 }]);
  // La liste montrée au cran k EST la liste du cran k — ses liens mis à part.
  const cran1 = creerMoteur(catalogue, { filetTemporel: false }).resoudre('hope', { fouille: 1 });
  assert.deepEqual(provisoires[2].liste.approches.map((a) => `${a.rang}:${a.codes}:${a.score}:${a.suggestion ?? ''}`),
    cran1.approches.map((a) => `${a.rang}:${a.codes}:${a.score}:${a.suggestion ?? ''}`));
  // Et une liste déjà rendue ne bouge plus quand le cran suivant se calcule.
  const avant = signature(provisoires[0].liste);
  moteur.resoudre('hope', { fouille: 3 });
  assert.deepEqual(signature(provisoires[0].liste), avant);
});

test('provisoire — un cran déjà en mémoire se montre avant tout nouveau calcul, à l’identique', () => {
  const moteur = creerMoteur(catalogue, { filetTemporel: false });
  moteur.resoudre('hope', { fouille: 1 });
  const evenements = [];
  moteur.resoudre('hope', {
    fouille: 2,
    surAvancement: () => evenements.push('avancement'),
    surListe: (liste, info) => evenements.push({ liste, info }),
  });
  const listes = evenements.filter((x) => x !== 'avancement');
  assert.equal(listes.length, 1, 'le cran 0 et le cran 1 sont en mémoire : seul le plus haut se montre');
  assert.notEqual(evenements[0], 'avancement', 'la liste en mémoire se montre AVANT de chercher');
  assert.deepEqual(listes[0].info, { cran: 1, fouille: 2 });
  // Depuis la mémoire ou depuis le calcul : la même liste, suggestions comprises.
  const neuf = chercher(creerMoteur(catalogue, { filetTemporel: false }), 'hope', { fouille: 2 });
  assert.deepEqual(signature(listes[0].liste), signature(neuf.provisoires[2].liste));
});

test('provisoire — au cran 0, la liste du cran rapide se montre ; en mode non cumulatif, rien', () => {
  const auCran0 = chercher(creerMoteur(catalogue, { filetTemporel: false }), 'hope', { fouille: 0 }).provisoires;
  assert.deepEqual(auCran0.map((p) => p.info), [{ cran: -1, fouille: 0 }]);
  assert.equal(chercher(creerMoteur(catalogue, { filetTemporel: false, cumulatif: false }), 'hope', { fouille: 1 })
    .provisoires.length, 0);
  assert.equal(chercher(creerMoteur(catalogue, { filetTemporel: false, cranRapide: false }), 'hope', { fouille: 0 })
    .provisoires.length, 0, 'sans cran rapide, le cran 0 est le premier : rien à montrer avant');
});

/* ═══════════════════════════ 3. Le protocole ═════════════════════════════ */

test('canal — les listes provisoires ne voyagent que sur demande, avant le résultat, et se clonent', async () => {
  const moteur = creerMoteur(catalogue);
  const envoyes = [];
  const canal = creerCanal(moteur, (msg) => { envoyes.push(msg); return msg; });
  await canal.traiterProgressif({ type: 'resoudre', generation: 4, saisie: 'hope', fouille: 1 });
  assert.equal(envoyes.filter((x) => x.type === 'provisoire').length, 0, 'personne ne les a demandées');

  envoyes.length = 0;
  await canal.traiterProgressif({ type: 'resoudre', generation: 5, saisie: 'hope', fouille: 2, provisoires: true });
  const types = envoyes.map((x) => x.type);
  const provisoires = envoyes.filter((x) => x.type === 'provisoire');
  assert.ok(provisoires.length >= 1, 'au moins une liste provisoire');
  assert.ok(types.lastIndexOf('provisoire') < types.indexOf('resultat'), 'les listes provisoires précèdent le résultat');
  for (const p of provisoires) {
    assert.equal(p.generation, 5);
    assert.equal(p.fouille, 2, 'la liste provisoire se donne pour la liste demandée');
    assert.ok(Number.isInteger(p.cran) && p.cran < 2);
    assert.ok(p.approches.length >= 1);
    assert.doesNotThrow(() => structuredClone(p));
  }
});

test('canal — une recherche coiffée ne poste plus de liste provisoire', async () => {
  const moteur = creerMoteur(catalogue);
  const envoyes = [];
  const canal = creerCanal(moteur, (msg) => { envoyes.push(msg); return msg; });
  const vieille = canal.traiterProgressif({
    type: 'resoudre', generation: 1, saisie: 'Le chat dort sur le tapis rouge', fouille: 2, provisoires: true,
  });
  const neuve = canal.traiterProgressif({ type: 'resoudre', generation: 2, saisie: 'hope' });
  assert.equal(await vieille, null);
  await neuve;
  assert.equal(envoyes.filter((x) => x.generation === 1 && x.type === 'provisoire').length, 0);
});
