/** Le garde-fou du compositeur — non-régression.
 *
 *  ── Le défaut, pour qui le retrouvera ────────────────────────────────────
 *
 *  Sur Firefox, un élément dont l'OPACITÉ est animée est promu en couche de
 *  composition. La transformation que Firefox confie alors au compositeur est
 *  bâtie **sans les propriétés individuelles** `translate` / `rotate` /
 *  `scale` : le nœud est composé à l'identité, donc peint dans le coin
 *  supérieur gauche de la scène. Chromium les honore — d'où un défaut
 *  invisible en développement et systématique chez l'utilisateur.
 *
 *  Deux preuves obtenues alors : avec
 *  `layers.offmainthreadcomposition.async-animations = false` le défaut
 *  disparaît entièrement ; et un attribut `transform` posé en doublon EST
 *  honoré — le nœud se déplace alors deux fois.
 *
 *  ── Pourquoi ce test lit des fichiers plutôt que d'observer un rendu ─────
 *
 *  Ce défaut a coûté six tours. Il est invisible au DOM (les positions
 *  calculées sont justes), invisible en pause (sans animation, pas de
 *  promotion en couche), invisible sous Chromium, et invisible sous Firefox
 *  SANS accélération matérielle — deux rapports « 0 anomalie » ont été rendus
 *  depuis des environnements incapables de le montrer. Aucun test de
 *  comportement exécutable ici ne peut donc l'attraper.
 *
 *  Ce qui est vérifiable, c'est la RECETTE : une opacité animée en même temps
 *  qu'une propriété individuelle de transformation, sur le même élément.
 *
 *  Correctif en vigueur : chaîne de position imbriquée (CONTRACTS §3.2,
 *  règles 3 et 4). `nhl-pos` porte `transform: translate(…)` et n'est jamais
 *  animé en opacité ; `nhl-rot` porte la rotation ; le contenu porte l'échelle
 *  et l'opacité. L'élément promu n'a plus aucune position à perdre. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function fichiers(depuis, garder) {
  const out = [];
  (function marcher(d) {
    for (const nom of readdirSync(d)) {
      if (nom === 'node_modules' || nom === 'dist' || nom === '.git') continue;
      const p = resolve(d, nom);
      if (statSync(p).isDirectory()) marcher(p);
      else if (garder(nom)) out.push(p);
    }
  })(depuis);
  return out;
}

test('compositeur — aucune @keyframes n’anime l’opacité ET une transformation individuelle', () => {
  const fautives = [];
  for (const f of fichiers(resolve(racine, 'src'), (n) => n.endsWith('.css'))) {
    const css = readFileSync(f, 'utf8');
    for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)) {
      const [, nom, corps] = m;
      const geo = corps.match(/(?:^|[\s;{])(translate|rotate|scale)\s*:/);
      if (/(?:^|[\s;{])opacity\s*:/.test(corps) && geo) {
        fautives.push(`${relative(racine, f)} → @keyframes ${nom} (opacity + ${geo[1]})`);
      }
    }
  }
  assert.deepEqual(fautives, [],
    'Recette du défaut Firefox : sur un même élément, une opacité animée fait perdre les '
    + 'propriétés individuelles de transformation. Porte la position sur un parent non animé '
    + '(CONTRACTS §3.2, règles 3 et 4).\n  - ' + fautives.join('\n  - '));
});

test('compositeur — le moteur visuel n’écrit jamais de propriété individuelle', () => {
  const fautifs = [];
  for (const f of fichiers(resolve(racine, 'src/visuel'), (n) => n.endsWith('.js'))) {
    if (f.includes('/tests/')) continue;
    const js = readFileSync(f, 'utf8');
    for (const m of js.matchAll(/\.style\.(translate|rotate|scale)\s*=/g)) {
      fautifs.push(`${relative(racine, f)} → style.${m[1]} =`);
    }
  }
  assert.deepEqual(fautifs, [],
    'Le moteur visuel compose par `transform` sur une chaîne de porteurs, jamais par les '
    + 'propriétés individuelles : Firefox les perd à la composition.');
});
