/**
 * ★ **UNE TEINTE DOIT ÊTRE UNE COULEUR — et `tokens.css` n'en contient pas que.**
 *
 * > « Dans glyphes.html, les 2 dernières colonnes restent vides. » (l'auteur)
 *
 * Elles l'étaient parce que je les avais peintes en `var(--oracle)` et
 * `var(--pedagogue)`. Les deux jetons EXISTENT — un `grep` me l'avait confirmé,
 * et c'est bien ce qui m'a trompé — mais ce sont des familles de POLICES :
 * `stroke: "Jost", Futura, …` est invalide, et un tracé sans `stroke` valide ne
 * se peint pas. Vérifier qu'un jeton existe ne dit rien de ce qu'il contient.
 *
 * ★ **C'EST LA DEUXIÈME FOIS que ce défaut passe**, et c'est pourquoi il mérite
 *   un test plutôt qu'une relecture attentive : le trait de fraction est resté
 *   INVISIBLE pendant toute une session parce que sa classe `.nhl-filet`
 *   n'existait dans aucune feuille. Un tracé sans encre ne proteste pas — il ne
 *   se dessine pas, et rien dans la page ne dit pourquoi.
 *
 * Le test est statique : il lit la page et la feuille de jetons, sans DOM ni
 * navigateur. C'est suffisant, parce que la faute est déjà tout entière dans le
 * texte des deux fichiers.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ICI = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(ICI, 'glyphes-main.js'), 'utf8');
const jetons = readFileSync(join(ICI, '..', 'styles', 'tokens.css'), 'utf8');

/** La valeur d'un jeton CSS, telle que `:root` la pose. */
function valeurDuJeton(nom) {
  const m = new RegExp(`^\\s*--${nom}:\\s*([^;]+);`, 'm').exec(jetons);
  return m ? m[1].trim() : null;
}

/** Une valeur qui peut servir de `stroke` : couleur littérale ou renvoi. */
const estUneCouleur = (v) => /^#[0-9a-f]{3,8}$/i.test(v)
  || /^(rgb|hsl|color|oklch|lab)a?\(/i.test(v)
  || /^var\(--/.test(v);

test('★ glyphes — chaque teinte de tracé est bien une COULEUR', () => {
  // Les teintes sont écrites en clair dans les appels de dessin : on les relève
  // là où elles servent, plutôt que de tenir une liste à côté qui dériverait.
  const teintes = [...source.matchAll(/'var\(--([a-z0-9-]+)\)'/g)].map((m) => m[1]);
  assert.ok(teintes.length >= 4, `au moins quatre teintes attendues, vu ${teintes.length}`);

  for (const nom of new Set(teintes)) {
    const v = valeurDuJeton(nom);
    assert.ok(v, `le jeton « --${nom} » n'existe pas dans tokens.css`);
    assert.ok(estUneCouleur(v),
      `« --${nom} » vaut ${JSON.stringify(v)} : ce n'est pas une couleur, `
      + 'et un tracé peint avec ne se dessinera pas');
  }
});
