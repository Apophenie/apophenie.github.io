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
import { GLYPHES } from '../moteur/tables/glyphes.js';
import { setGlyphes, deriveGlyph } from '../visuel/glyphes.js';
import { CANDIDATS } from '../gfx/_glyphes-candidats.js';
import { AXES, TRAITS } from '../gfx/_glyphes-axe.js';

const ICI = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(ICI, 'glyphes-main.js'), 'utf8');
const jetons = readFileSync(join(ICI, '..', 'styles', 'tokens.css'), 'utf8');

setGlyphes(GLYPHES, 'moteur/tables/glyphes.js');

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

/**
 * ★ **LA GÉOMÉTRIE VIENT DE LA POLICE, LA TOPOLOGIE VIENT DE LA RECETTE — et
 *   c'est l'accord des deux qui rend `TRAITS` adoptable.**
 *
 * `src/gfx/jetbrains-axe.py` repose sur l'axe exact les traits que
 * `jetbrains-traces.py` DÉCLARE. Si la pose se trompe — un bout qui n'atteint
 * pas son partenaire, un trait qui ramasse un morceau d'un autre — les comptes
 * changent, et ces comptes sont ceux que `mtrb`, `mexb` et `mbob` facturent.
 *
 * ⚠️ **CE TEST A UNE HISTOIRE, ET C'EST POURQUOI IL EST ÉCRIT.** Trois manières
 *   de découper l'axe ont été essayées ; la meilleure rendait DIX-HUIT lettres
 *   sur vingt-six, et rien à l'écran ne le disait — les dessins restaient
 *   plausibles. Seul le comptage l'a montré.
 */
const BAS_DE_CASSE = [...'abcdefghijklmnopqrstuvwxyz'];

const comptes = (g) => {
  const d = deriveGlyph(g);
  return `${d.traits} traits · ${d.extremites} extrémités · ${d.boucles} boucles`;
};

test('★ glyphes — les traits posés sur l’axe ont la topologie de leur recette', () => {
  for (const c of BAS_DE_CASSE) {
    assert.ok(TRAITS[c], `« ${c} » n'a pas de traits engendrés`);
    assert.ok(CANDIDATS[c], `« ${c} » n'a pas de recette`);
    assert.equal(comptes(TRAITS[c]), comptes(CANDIDATS[c]),
      `« ${c} » : la pose sur l'axe ne rend pas la topologie déclarée`);
  }
});

test('★ glyphes — l’axe couvre les deux répertoires, les traits le bas de casse', () => {
  // Les capitales n'ont pas de recette, donc pas de topologie déclarée ; leur
  // axe, lui, se lit aussi bien, et la page l'affiche.
  for (const c of [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ']) {
    assert.ok(AXES[c] && AXES[c].startsWith('M'), `« ${c} » n'a pas d'axe`);
  }
  assert.equal(Object.keys(TRAITS).length, BAS_DE_CASSE.length);
});
