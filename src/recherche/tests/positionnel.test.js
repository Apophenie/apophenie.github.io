/**
 * ★ **LA NOTATION POSITIONNELLE, PAR LE CHEMIN DU SITE** — le lien, le rejeu,
 * le scénario, la compilation.
 *
 * > « C'est en nombre de caractères donc ça peut couper un nombre ; si je veux
 * >   le nombre, j'élargis pour l'inclure. » (l'autrice, 18 septembre 2026)
 *
 * Le lien de référence est celui de l'autrice, « Louis Fouché » :
 * `fl+mpy+mtri+1cs+2cs+mtri+0cs+mr9+mpf`. On le rejoue comme la page le rejoue
 * — `lire` SANS catalogue (`app/pont.js › lireHash`), puis `rejouer`, puis
 * `scenarioDe` — et on relit la ligne après chaque étape. Aucune recherche : ce
 * n'est pas elle qui énumère ces positions, c'est une écriture de lien.
 *
 * ★ Et la ligne MONTRÉE est relevée sur la scène compilée, étape par étape,
 *   puis comparée à celle que suit le moteur de recherche (`suivreLaLigne`) :
 *   c'est le contrôle de `lents/integration-visuel.test.js`, restreint à ces
 *   trois liens, parce que la redécoupe d'une ligne est précisément le geste
 *   qui pourrait faire diverger les deux sans qu'aucun calcul ne le voie.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { creerMoteur } from '../index.js';
import { lire, BANDEAUX } from '../url.js';
import { suivreLaLigne } from '../scenario.js';
import { catalogue } from './_catalogue.js';
import { compile } from '../../visuel/compile.js';
import { Scene } from '../../visuel/scene.js';
import { TOKEN_GAP } from '../../visuel/constants.js';
import { setGlyphes } from '../../visuel/glyphes.js';
import { GLYPHES } from '../../visuel/fixtures/glyphes.js';
import { lecteur } from '../../visuel/tests/_lecteur.js';

setGlyphes(GLYPHES, 'fixtures/glyphes.js');
const moteur = creerMoteur(catalogue);

const FOUCHE = '7NFn8xBqb5eNAq3YCY';
const LIEN = `?fl+mpy+mtri+1cs+2cs+mtri+0cs+mr9+mpf$${FOUCHE}`;
const LIEN_ELARGI = `?fl+mpy+mtri+1.2.2cs$${FOUCHE}`;
/** `Lou` → 12 15 21 : la position 1 tombe DANS le 12, et la fenêtre dans le 15. */
// Ce témoin obtient 3 : il vise donc 3, au lieu de revendiquer un 666 absent.
const LIEN_COUPE = '?ma1+1cs$:Lou$:3';

/** Le chemin de la page : lecture sans catalogue, rejeu, scénario. */
function jouer(lien) {
  const lecture = lire(lien);
  assert.equal(lecture.forme, 'canonique', lecture.raison);
  const r = moteur.rejouer(lecture);
  assert.ok(r.ok, `${r.raison} — ${r.detail}`);
  const sc = moteur.scenarioDe(r.approche, { saisie: lecture.saisie, registre: lecture.registre, cible: lecture.cible });
  return { lecture, approche: r.approche, sc };
}

/** Chaque code, et la ligne qu'il laisse. */
const trace = (approche) => approche.parts[0].chemin.ops
  .map((o, i) => [o.code, approche.parts[0].chemin.etats[i + 1].valeur]);

/** La ligne de la SCÈNE à l'entrée de chaque étape (voir `integration-visuel`). */
function relever(sc) {
  const releves = [];
  const original = Scene.prototype.oublierAncres;
  Scene.prototype.oublierAncres = function mouchard() {
    releves.push({
      ids: this.flow.slice(),
      frontieres: new Set(this.flow.filter((id) => {
        const g = this.get(id).gapBefore;
        return g !== undefined && g > TOKEN_GAP;
      })),
    });
    return original.call(this);
  };
  let tl;
  try { tl = compile(sc); } finally { Scene.prototype.oublierAncres = original; }
  return { tl, releves };
}

function ligneMontreeEstLaLigneSuivie(sc, quoi) {
  const { tl, releves } = relever(sc);
  assert.deepEqual(tl.warnings, [], `${quoi} : ${tl.warnings.join(' | ')}`);
  const rejeu = suivreLaLigne(sc.tokens, sc.steps);
  for (let i = 0; i + 1 < sc.steps.length; i++) {
    assert.notEqual(rejeu[i], null, `${quoi} : le rejeu de la ligne a renoncé à l’étape ${i + 1}`);
    assert.deepEqual(rejeu[i].ids, releves[i + 1].ids, `${quoi} — ligne après « ${sc.steps[i].caption} »`);
    assert.deepEqual([...rejeu[i].frontieres].sort(), [...releves[i + 1].frontieres].sort(),
      `${quoi} — frontières après « ${sc.steps[i].caption} »`);
  }
  return tl;
}

test('★ le lien de l’autrice se rejoue, et chaque étape laisse la ligne attendue', () => {
  const { approche, sc } = jouer(LIEN);
  assert.deepEqual(trace(approche), [
    ['fl', 'LouisFouché'],
    ['tca', ['L', 'o', 'u', 'i', 's', 'F', 'o', 'u', 'c', 'h', 'é']],
    ['mpy', [3, 6, 3, 9, 1, 6, 6, 3, 3, 8, 5]],
    ['mtri', [1, 3, 3, 3, 3, 5, 6, 6, 6, 8, 9]],
    ['1cs', [1, 6, 3, 3, 5, 6, 6, 6, 8, 9]],
    ['2cs', [1, 6, 6, 5, 6, 6, 6, 8, 9]],
    ['mtri', [1, 5, 6, 6, 6, 6, 6, 8, 9]],
    ['0cs', [6, 6, 6, 6, 6, 6, 8, 9]],
    ['mr9', [6, 6, 6, 6, 6, 6, 8, 6]],
    ['mpf', [6, 6, 6, 6, 6, 6, 6]],
  ]);
  assert.equal(approche.url, LIEN, 'le lien rendu est celui qu’on a joué');
  assert.equal(sc.avertissements, undefined, (sc.avertissements || []).join(' | '));
  // Les trois additions localisées se montrent chacune par SA paire.
  const additions = sc.steps.filter((s) => (s.ops || []).some((o) => o.op === 'sum'));
  assert.deepEqual(additions.map((s) => s.caption), ['3 + 3 = 6', '3 + 3 = 6', '1 + 5 = 6']);
  ligneMontreeEstLaLigneSuivie(sc, 'Louis Fouché');
});

test('★ `1.2.2cs` élargit l’opérande : 33 + 33, et les chiffres se collent AVANT', () => {
  const { approche, sc } = jouer(LIEN_ELARGI);
  assert.deepEqual(trace(approche).at(-1), ['1.2.2cs', [1, 66, 5, 6, 6, 6, 8, 9]]);
  const i = sc.steps.findIndex((s) => (s.ops || []).some((o) => o.op === 'merge'));
  assert.ok(i >= 0, 'le collage est JOUÉ');
  assert.equal(sc.steps[i].caption, '1 3 3 3 3 5 6 6 6 8 9 → 1 33 33 5 6 6 6 8 9');
  assert.equal(sc.steps[i + 1].caption, '33 + 33 = 66', 'le calcul vient APRÈS le collage');
  ligneMontreeEstLaLigneSuivie(sc, '1.2.2cs');
});

/**
 * ★ UNE FENÊTRE QUI COUPE DES NOMBRES : ils se scindent visiblement, puis le
 * geste n'embrasse que ce qui est sous la fenêtre. Sur la scène, les jetons
 * hors fenêtre ne changent pas d'écriture et ne disparaissent à aucun instant.
 */
test('★ une coupe se voit avant le geste, et le geste laisse le reste en place', () => {
  const { approche, sc } = jouer(LIEN_COUPE);
  assert.deepEqual(trace(approche).at(-1), ['1cs', [1, 3, 5, 21]]);
  const i = sc.steps.findIndex((s) => (s.ops || []).some((o) => o.op === 'substitute'
    && o.pairs.some((p) => Array.isArray(p.to))));
  assert.ok(i >= 0, 'la scission est JOUÉE');
  assert.equal(sc.steps[i].caption, '12 15 21 → 1 2 1 5 21');
  const somme = sc.steps[i + 1];
  assert.equal(somme.caption, '2 + 1 = 3');
  const sum = somme.ops.find((o) => o.op === 'sum');
  const scission = sc.steps[i].ops[0].pairs;
  assert.deepEqual(sum.targets, [scission[0].to[1].id, scission[1].to[0].id],
    'l’accolade prend le 2 du 12 et le 1 du 15, rien d’autre');

  const tl = ligneMontreeEstLaLigneSuivie(sc, 'coupe');
  const L = lecteur(tl);
  const { t0, t1 } = tl.steps[i + 1];
  // Le 21, que rien n'a coupé, garde le jeton qu'il avait avant la scission.
  const vingtEtUn = L.visibles(tl.steps[i].t0 + 1).find((v) => v.texte === '21');
  assert.ok(vingtEtUn, 'le 21 est sur la ligne');
  const hors = [scission[0].to[0].id, scission[1].to[1].id, vingtEtUn.id];
  for (let k = 0; k <= 40; k++) {
    const t = t0 + ((t1 - t0) * k) / 40;
    const vus = new Map(L.visibles(t).map((v) => [v.id, v]));
    for (const id of hors) assert.ok(vus.has(id), `${id} reste visible à t=${Math.round(t - t0)}`);
    assert.deepEqual(hors.map((id) => vus.get(id).texte), ['1', '5', '21']);
  }
});

test('★ les refus, par le rejeu, et leur bandeau', () => {
  // Une fenêtre au-delà de la ligne : `12 15 21` n'a que six caractères.
  let r = moteur.rejouer(lire('?ma1+5.3mr9$:Lou'));
  assert.equal(r.ok, false);
  assert.equal(r.bandeau, BANDEAUX.positionImpossible('5.3mr9'));
  assert.match(r.detail, /6 caractère/);
  // Une coupe qui laisserait un zéro de tête : Q vaut 102 en gématrie anglaise.
  r = moteur.rejouer(lire('?mx6+0mr9$:Q'));
  assert.equal(r.bandeau, BANDEAUX.positionImpossible('0mr9'));
  assert.match(r.detail, /zéro de tête/);
  // ★ Une conversion du TEXTE : la grammaire seule la laisse passer — la page
  //   lit sans catalogue —, le rejeu la refuse, avec le bandeau du préfixe et
  //   non celui d'une version inconnue.
  r = moteur.rejouer(lire('?2mpy$:Lou'));
  assert.equal(r.ok, false);
  assert.equal(r.bandeau, BANDEAUX.positionIllisible);
  assert.match(r.detail, /n’admet pas de position/);
  // Un opérateur de base qui refuse SA fenêtre : c'est sa règle qui parle.
  r = moteur.rejouer(lire('?ma1+1.3mr9$:Lou'));
  assert.equal(r.bandeau, BANDEAUX.regleRefusee('1.3mr9'));
});
