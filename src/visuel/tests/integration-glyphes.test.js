/**
 * Intégration avec `src/moteur/tables/` — le point d'articulation le plus
 * critique du projet.
 *
 * CONTRACTS §0.3 : « les tables `traits`, `extremites` et `boucles` ne sont pas
 * saisies à la main, elles sont calculées à partir de la définition vectorielle
 * des glyphes. Ce que le spectateur voit à l'écran est donc, littéralement, ce
 * qui a été compté. »
 *
 * Ce test le vérifie **des deux côtés** : la dérivation du moteur visuel (celle
 * qui pilote le dessin de `countStrokes`) doit donner exactement les tables du
 * moteur arithmétique (celles qui pilotent le calcul). Toute divergence
 * signifierait une démonstration qui se contredit à l'écran.
 *
 * Les tables appartiennent à un autre agent : si elles n'existent pas encore,
 * le test est ignoré plutôt qu'en échec.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { deriveGlyph } from '../glyphes.js';

const MAJ = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const MIN = [...'abcdefghijklmnopqrstuvwxyz'];

async function tryImport(spec) {
  try { return await import(spec); } catch { return null; }
}

const glyphesMod = await tryImport('../../moteur/tables/glyphes.js');
const deriveesMod = await tryImport('../../moteur/tables/derivees.js');

test('les 52 glyphes du moteur arithmétique sont exploitables par le moteur visuel', { skip: !glyphesMod && 'src/moteur/tables/glyphes.js pas encore écrit' }, () => {
  const G = glyphesMod.GLYPHES;
  for (const ch of [...MAJ, ...MIN]) {
    assert.ok(G[ch], `glyphe « ${ch} » absent de la table`);
    assert.doesNotThrow(() => deriveGlyph(G[ch]), `le tracé de « ${ch} » n'est pas analysable`);
  }
});

test('ce qui est dessiné est exactement ce qui est compté (52 glyphes)', {
  skip: (!glyphesMod || !deriveesMod) && 'tables du moteur arithmétique pas encore écrites',
}, () => {
  const G = glyphesMod.GLYPHES;
  const {
    TRAITS_MAJ, TRAITS_MIN, EXTREMITES_MAJ, EXTREMITES_MIN, BOUCLES_MAJ, BOUCLES_MIN,
  } = deriveesMod;

  const jeux = [
    ['capitales', MAJ, TRAITS_MAJ, EXTREMITES_MAJ, BOUCLES_MAJ],
    ['bas de casse', MIN, TRAITS_MIN, EXTREMITES_MIN, BOUCLES_MIN],
  ];

  const divergences = [];
  for (const [nom, set, traits, ext, boucles] of jeux) {
    for (const ch of set) {
      const d = deriveGlyph(G[ch]);
      const attendu = [traits[ch], ext[ch], boucles[ch]];
      const obtenu = [d.traits, d.extremites, d.boucles];
      if (JSON.stringify(attendu) !== JSON.stringify(obtenu)) {
        divergences.push(`${nom} « ${ch} » : dessiné ${obtenu.join('/')}, compté ${attendu.join('/')}`);
      }
    }
  }
  assert.deepEqual(divergences, [], divergences.join('\n'));
});

test('les extrémités libres sont localisées de la même façon des deux côtés', {
  skip: (!glyphesMod || !deriveesMod || !deriveesMod.DETAIL) && 'DETAIL non exposé',
}, () => {
  const G = glyphesMod.GLYPHES;
  for (const ch of [...MAJ, ...MIN]) {
    const detail = deriveesMod.DETAIL[ch];
    if (!detail || !detail.libres) continue;
    const mien = deriveGlyph(G[ch]).libres;
    assert.equal(mien.length, detail.libres.length, `« ${ch} » : ${mien.length} marqueurs dessinés pour ${detail.libres.length} extrémités comptées`);
    const clef = (p) => `${Math.round(p.x)},${Math.round(p.y)}`;
    assert.deepEqual(
      mien.map(clef).sort(),
      detail.libres.map(clef).sort(),
      `« ${ch} » : les marqueurs ne sont pas posés aux mêmes endroits`,
    );
  }
});

test('un scénario de comptage compile contre la table réelle', { skip: !glyphesMod && 'table absente' }, async () => {
  const { compile } = await import('../compile.js');
  const { setGlyphes } = await import('../glyphes.js');
  setGlyphes(glyphesMod.GLYPHES, 'src/moteur/tables/glyphes.js');
  const attendu = deriveesMod ? deriveesMod.TRAITS_MAJ.H : 3;
  const tl = compile({
    version: 1,
    tokens: [{ id: 'h', text: 'H', kind: 'letter' }],
    steps: [{ id: 's0', title: 'On compte les traits', ops: [{ op: 'countStrokes', target: 'h', mode: 'traits', count: attendu }] }],
  });
  assert.ok(tl.total > 0);
  const traits = tl.nodes.filter((n) => n.id.startsWith('@trait:'));
  assert.equal(traits.length, attendu, 'un sous-chemin dessiné par trait compté');
});
