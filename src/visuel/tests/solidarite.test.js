/**
 * ★ LA SOLIDARITÉ D'UN DÉCOR ACCROCHÉ — et l'homothétie du verdict.
 *
 * Le constat de l'auteur : « quand il y a zoom/déplacement, il faudrait ajuster
 * les easing pour que texte et svg restent solidaires, actuellement il y a
 * déformation durant la transition ».
 *
 * Un décor accroché (`data.suit` — les cornes du 666, le halo) n'a pas de
 * trajectoire propre : il n'a de sens que collé à ce qu'il désigne. À l'arrivée
 * il l'était déjà ; c'est PENDANT le trajet qu'il se détachait, et un décalage
 * qui ne se voit qu'en mouvement ne se rattrape par aucune inspection d'état
 * final. D'où deux règles, mesurées ici et non affirmées :
 *
 *  1. **canal par canal** — pour chaque animation d'un jeton suivi sur un canal
 *     qui DÉPLACE (`translate`, `rotate`, `scale`), et pour chaque disparition
 *     (`opacity` → 0), le satellite porte une animation de même `delay`, même
 *     `duration` et même `easing`. Pas « à peu près en même temps » : la même ;
 *  2. **le verdict est une HOMOTHÉTIE** — il grossit le groupe par deux canaux
 *     à la fois (`translate` écarte les chiffres, `scale` grossit les glyphes)
 *     alors que le décor n'en a qu'un. Deux courbes différentes sur ces deux
 *     canaux, et l'ensemble n'est plus une homothétie qu'aux deux extrémités du
 *     trajet : au milieu, les cornes sont trop larges pour l'écartement des 6
 *     qu'elles couronnent, et les chiffres se chevauchent entre eux.
 *
 * C'est ce fichier qui empêche la régression, pas le correctif : les deux
 * règles sont invisibles à l'œil sur une image fixe, et personne ne les
 * retrouverait en relisant du code.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../compile.js';
import { setGlyphes } from '../glyphes.js';
import { GLYPHES } from '../fixtures/glyphes.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');

const sc = (steps, tokens) => ({ version: 1, tokens, steps });
const chiffres = (suite) => [...suite].map((c, i) => ({ id: `d${i}`, text: c, kind: 'digit' }));

/** Les canaux qui DÉPLACENT — ceux dont un décor accroché ne peut pas se passer. */
const CANAUX_QUI_DEPLACENT = new Set(['translate', 'rotate', 'scale']);

/** La signature temporelle d'une animation : ce qui doit coïncider exactement. */
const cadre = (a) => `${a.prop} @${a.delay} × ${a.duration} ${a.easing}`;

/**
 * Tous les manquements à la solidarité d'une timeline compilée.
 *
 * ★ Les animations antérieures à la NAISSANCE du décor sont hors sujet : un
 * jeton a vécu avant d'être couronné, et exiger que les cornes aient suivi un
 * mouvement d'avant leur existence n'aurait pas de sens.
 */
function griefsDeSolidarite(tl) {
  const satellites = new Map();
  for (const n of tl.nodes) {
    const suit = n.data && n.data.suit;
    if (typeof suit !== 'string' || !suit) continue;
    if (!satellites.has(suit)) satellites.set(suit, []);
    satellites.get(suit).push(n.id);
  }
  const cadresDe = new Map();
  for (const a of tl.anims) {
    if (!cadresDe.has(a.id)) cadresDe.set(a.id, new Set());
    cadresDe.get(a.id).add(cadre(a));
  }
  const griefs = [];
  for (const [hote, sats] of satellites) {
    const naissance = Math.min(...tl.anims.filter((a) => sats.includes(a.id)).map((a) => a.delay));
    for (const a of tl.anims) {
      if (a.id !== hote || a.delay < naissance) continue;
      const disparait = a.prop === 'opacity' && a.keyframes.at(-1).value === 0;
      if (!CANAUX_QUI_DEPLACENT.has(a.prop) && !disparait) continue;
      for (const sid of sats) {
        if (!(cadresDe.get(sid) || new Set()).has(cadre(a))) {
          griefs.push(`« ${sid} » ne suit pas « ${hote} » sur ${cadre(a)}`);
        }
      }
    }
  }
  return griefs;
}

test('★ un décor accroché suit son jeton sur CHAQUE canal, à la milliseconde et à la courbe près', () => {
  // Trois scènes où le jeton couronné est successivement effacé sur place,
  // précipité hors du flux, et grossi par le verdict — les trois manières dont
  // un décor pouvait se détacher.
  const scenes = {
    'la gomme': sc([
      { id: 'a', title: 'Trois 6 d’affilée', ops: [{ op: 'horns', targets: ['d0', 'd1', 'd2'], efface: ['d3'] }] },
      { id: 'b', title: 'On efface', ops: [{ op: 'drop', targets: ['d1'], mode: 'erase', regroup: false }] },
    ], chiffres('6667')),
    'la chute': sc([
      { id: 'a', title: 'Trois 6 d’affilée', ops: [{ op: 'horns', targets: ['d0', 'd1', 'd2'], efface: ['d3'] }] },
      { id: 'b', title: 'On fait tomber', ops: [{ op: 'drop', targets: ['d1'], mode: 'fall' }] },
    ], chiffres('6667')),
    'le verdict': sc([
      { id: 'a', title: 'Trois 6 d’affilée', ops: [{ op: 'horns', targets: ['d0', 'd1', 'd2'], efface: ['d3'] }] },
      { id: 'b', title: 'Le verdict', ops: [{ op: 'reveal', targets: ['d0', 'd1', 'd2'] }] },
    ], chiffres('6667')),
    'le verdict à deux séries': sc([
      { id: 'a', title: 'Trois 6 d’affilée', ops: [{ op: 'horns', targets: ['d0', 'd1', 'd2'], efface: [] }] },
      { id: 'b', title: 'Trois autres', ops: [{ op: 'horns', targets: ['d3', 'd4', 'd5'], efface: [] }] },
      { id: 'c', title: 'Le verdict', ops: [{ op: 'reveal', targets: ['d0', 'd1', 'd2', 'd3', 'd4', 'd5'] }] },
    ], chiffres('666666')),
  };
  for (const [quoi, scenario] of Object.entries(scenes)) {
    const griefs = griefsDeSolidarite(compile(scenario));
    assert.deepEqual(griefs, [], `${quoi} : ${griefs.join(' ; ')}`);
  }
});

/**
 * ★ Et le halo est un décor accroché comme un autre.
 *
 * Il l'a toujours été — `scene.satellitesDe` le joint aux accrochages déclarés
 * —, mais il était traité à la main par une demi-douzaine de primitives, avec
 * chaque fois sa propre durée et sa propre courbe. C'est cette divergence-là
 * qui a fait le défaut ; le test la ferme aussi de ce côté.
 */
test('★ le halo suit son jeton exactement comme les cornes', () => {
  const tl = compile(sc([
    { id: 'a', title: 'Le verdict', ops: [{ op: 'reveal', targets: ['d0', 'd1', 'd2'], halo: true }] },
  ], chiffres('6667')));
  const halos = tl.nodes.filter((n) => n.role === 'halo').map((n) => n.id);
  assert.ok(halos.length, 'le verdict à halo doit en poser un par chiffre');
  const cadresDe = (id) => new Set(tl.anims.filter((a) => a.id === id).map(cadre));
  for (const hid of halos) {
    const hote = tl.scene.get(hid).data.of;
    for (const a of tl.anims) {
      if (a.id !== hote || !CANAUX_QUI_DEPLACENT.has(a.prop)) continue;
      assert.ok(cadresDe(hid).has(cadre(a)),
        `le halo « ${hid} » ne suit pas « ${hote} » sur ${cadre(a)}`);
    }
  }
});

/**
 * ★ L'HOMOTHÉTIE DU VERDICT.
 *
 * Le layout amène chaque jeton de `p₀` à `p₁ = c + (p₀ − c)·G` autour du centre
 * `c`, tandis que son échelle va de 1 à `G`. Sur une seule courbe `u(t)`, la
 * position vaut `c + (p₀ − c)·(1 + (G − 1)·u)` et l'échelle `1 + (G − 1)·u` :
 * le même facteur, au même instant, donc une homothétie EXACTE tout au long du
 * trajet. Sur deux courbes, l'égalité ne tient qu'aux deux bouts.
 *
 * Le test ne compare pas des courbes choisies à la main : il vérifie qu'un
 * même geste — même départ, même durée — n'en emploie qu'une.
 */
test('★ le verdict grossit sur UNE SEULE courbe : position et taille ne peuvent pas diverger', () => {
  for (const suite of ['666', '666666', '666666666666666']) {
    const ids = [...suite].map((_, i) => `d${i}`);
    const tl = compile(sc([
      { id: 'a', title: 'Le verdict', ops: [{ op: 'reveal', targets: ids }] },
    ], chiffres(suite)));

    const parGeste = new Map();
    for (const a of tl.anims) {
      if (a.prop !== 'translate' && a.prop !== 'scale') continue;
      const cle = `${a.delay}/${a.duration}`;
      if (!parGeste.has(cle)) parGeste.set(cle, new Set());
      parGeste.get(cle).add(a.easing);
    }
    for (const [cle, courbes] of parGeste) {
      assert.equal(courbes.size, 1,
        `« ${suite} » : le geste ${cle} emploie ${courbes.size} courbes (${[...courbes].join(', ')}) — `
        + 'les chiffres s’écarteraient sur l’une pendant qu’ils grossiraient sur l’autre');
    }
  }
});

/**
 * ★ « Quand il y a plusieurs séries de 666, [les cornes] seulement sur les 666
 * de la ligne du haut, pour éviter de surcharger en effet » (l'auteur).
 *
 * Le verdict ne passe à deux rangs qu'au-delà de trois séries. Sur un seul
 * rang, tout ce qui est couronné le reste : il n'y a rien à alléger.
 */
test('★ à deux rangs, seules les cornes du rang du haut restent', () => {
  const couronner = (n) => {
    const steps = [];
    for (let s = 0; s < n; s++) {
      steps.push({
        id: `h${s}`, title: 'Trois 6 d’affilée',
        ops: [{ op: 'horns', targets: [0, 1, 2].map((k) => `d${s * 3 + k}`), efface: [] }],
      });
    }
    const ids = Array.from({ length: n * 3 }, (_, i) => `d${i}`);
    steps.push({ id: 'v', title: 'Le verdict', ops: [{ op: 'reveal', targets: ids }] });
    return compile(sc(steps, chiffres('6'.repeat(n * 3))));
  };
  /**
   * Les séries dont les cornes finissent invisibles.
   *
   * Une série en porte DEUX, une par 6 extérieur (`horns.js`, « UNE CORNE, UN
   * NŒUD ») : on exige que les deux s'éteignent, pas l'une des deux — un rang
   * détrôné à moitié serait pire que pas détrôné du tout.
   */
  const eteintes = (tl, n) => {
    const out = [];
    for (let s = 0; s < n; s++) {
      const ids = [`@cornes:d${s * 3}`, `@cornes:d${s * 3 + 2}`];
      const eteinte = (id) => {
        const derniere = tl.anims.filter((a) => a.id === id && a.prop === 'opacity').at(-1);
        return !!derniere && derniere.keyframes.at(-1).value === 0;
      };
      const combien = ids.filter(eteinte).length;
      assert.notEqual(combien, 1, `série ${s} : une corne éteinte sur deux`);
      if (combien === 2) out.push(s);
    }
    return out;
  };

  // Trois séries ou moins : un seul rang, personne n'est détrôné.
  for (const n of [1, 2, 3]) assert.deepEqual(eteintes(couronner(n), n), [], `${n} série(s) sur un rang`);
  // Cinq séries : deux rangs, la coupure tombe après la troisième (5 → 3 puis 2).
  assert.deepEqual(eteintes(couronner(5), 5), [3, 4], 'les deux séries du rang du bas perdent leurs cornes');
  assert.deepEqual(eteintes(couronner(4), 4), [2, 3], 'quatre séries : deux rangs de deux');
});
