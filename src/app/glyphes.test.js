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
import { setGlyphes, deriveGlyph, flatten } from '../visuel/glyphes.js';
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
 * ★ **LA GÉOMÉTRIE VIENT DE LA POLICE, ET LES COMPTES AUSSI.**
 *
 * > « n'adapte pas le tracé pour correspondre au compte que tu as de traits,
 * >   extrémités et boucles fermées. […] Le `i` oui il a une extrémité de plus,
 * >   c'est sûr, la police, n'essaie pas de tricher. » (l'auteur)
 *
 * Ce test ne vérifie donc PAS que les comptes des traits posés sur l'axe égalent
 * ceux de la recette : ce serait exiger du dessin qu'il obéisse à sa description.
 * Il vérifie les trois choses qui doivent tenir :
 *
 *  · **LES BOUCLES**, qui sont l'invariant. « Ça ne devrait pas changer quelle
 *    que soit la police ou presque » — un `g` à deux boucles existe ailleurs,
 *    pas ici. Une boucle qui apparaît ou disparaît est un défaut, pas une
 *    lecture ;
 *  · **LE NOMBRE DE TRAITS**, qui est la lecture elle-même : c'est la recette
 *    qui dit combien de fois le crayon se lève, et la pose ne peut pas en
 *    inventer un ni en perdre un ;
 *  · **AUCUN CONTACT INVENTÉ.** Une extrémité de moins que déclaré signifierait
 *    qu'on a rapproché deux traits pour faire tomber le compte juste. Une de
 *    PLUS est permise, et se lit comme ce qu'elle est : un contact que la
 *    recette annonce et que la police ne réalise pas là où elle le dit.
 *
 * ⚠️ **ET L'ÉCART À L'AXE EST BORNÉ.** C'est le garde-fou qui a manqué tout du
 *   long : trois refontes successives ont rendu des lettres à quatre-vingt-quinze,
 *   soixante-seize et deux cent vingt-quatre unités de leur axe — des dessins
 *   parfaitement plausibles à l'œil, et faux. Vingt unités sur six cents, c'est
 *   déjà beaucoup ; au-delà, ce n'est plus la lettre.
 */
const BAS_DE_CASSE = [...'abcdefghijklmnopqrstuvwxyz'];

const comptes = (g) => deriveGlyph(g);

/* ⚠️ Un `d` à plusieurs sous-chemins s'aplatit SOUS-CHEMIN PAR SOUS-CHEMIN : les
   relier fabrique un segment fantôme qui traverse la lettre, et toute mesure de
   distance s'appuie dessus pour paraître bonne. C'est ce qui m'a caché, une
   après-midi entière, que le `k` et le `i` étaient partis de travers. */
const nuageDe = (d) => d.split(/(?=M)/).filter((s) => s.trim()).map((s) => flatten(s).points);

const auTrace = (p, sous) => {
  let best = Infinity;
  for (const pts of sous) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]; const c = pts[i];
      const dx = c.x - a.x; const dy = c.y - a.y; const L2 = dx * dx + dy * dy;
      const t = L2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)) : 0;
      best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
    }
  }
  return best;
};

/* On DENSIFIE : un trait droit ne rend que ses deux bouts, et se trouverait donc
   exclu de la mesure — précisément les traits qu'on vient de redresser. Un point
   tous les trois unités sur six cents. */
function densifie(pts, pas = 3) {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]; const b = pts[i];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / pas));
    for (let j = 0; j < n; j++) out.push({ x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n });
  }
  if (pts.length) out.push(pts[pts.length - 1]);
  return out;
}

/** Le pire écart d'un jeu de traits à son axe — la FIDÉLITÉ, en unités du moteur. */
function ecartALAxe(traits, axe) {
  const sous = nuageDe(axe);
  let pire = 0;
  for (const t of traits) {
    const P = flatten(t.d).points;
    if (P.length < 2) continue;
    for (const p of densifie(P)) pire = Math.max(pire, auTrace(p, sous));
  }
  return pire;
}

/**
 * ★ **ET L'AUTRE SENS : LA COUVERTURE.**
 *
 * ⚠️ **LA FIDÉLITÉ SEULE NOTE PARFAITEMENT UN TRACÉ QUI NE COUVRE RIEN.** Un
 *   moignon posé sur l'axe en est tout près : il sort donc excellent. C'est ainsi
 *   qu'est passée une barre de `z` amputée de VINGT-CINQ unités — 0,5 de
 *   fidélité, la meilleure de l'alphabet, pour un tracé qui s'arrêtait à x = 368
 *   quand son axe va jusqu'à 395. Et une panse de `b` réduite à un tronçon de
 *   trente unités avait failli passer de la même façon : « c'est l'œil qui l'a
 *   vu, pas le chiffre ».
 *
 * On mesure donc aussi la distance maximale de l'AXE au tracé. Même précautions
 * que pour la fidélité — sous-chemin par sous-chemin, et densifié.
 *
 * ⚠️ Les sous-chemins d'axe de moins de quatre-vingts unités d'étendue sont
 *   ignorés : ce sont les points du `i` et du `j`, qui n'ont à être couverts par
 *   rien d'autre qu'eux-mêmes.
 */
const ETENDUE_BRIN = 80;

function couvertureDeLAxe(traits, axe) {
  const rendu = traits.map((t) => flatten(t.d).points).filter((p) => p.length >= 2);
  let pire = 0;
  for (const brin of nuageDe(axe)) {
    const xs = brin.map((p) => p.x); const ys = brin.map((p) => p.y);
    const etendue = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (etendue < ETENDUE_BRIN) continue;
    for (const p of densifie(brin)) pire = Math.max(pire, auTrace(p, rendu));
  }
  return pire;
}

test('★ glyphes — les traits posés gardent les boucles et les traits déclarés', () => {
  for (const c of BAS_DE_CASSE) {
    assert.ok(TRAITS[c], `« ${c} » n'a pas de traits engendrés`);
    assert.ok(CANDIDATS[c], `« ${c} » n'a pas de recette`);
    const a = comptes(CANDIDATS[c]); const b = comptes(TRAITS[c]);
    assert.equal(b.boucles, a.boucles,
      `« ${c} » : ${b.boucles} boucle(s) au lieu de ${a.boucles} — une boucle ne dépend pas de la pose`);
    assert.equal(b.traits, a.traits,
      `« ${c} » : ${b.traits} trait(s) au lieu de ${a.traits} — la pose n'en invente ni n'en perd`);
    assert.ok(b.extremites >= a.extremites,
      `« ${c} » : ${b.extremites} extrémités libres pour ${a.extremites} déclarées — `
      + 'un contact a été fabriqué pour faire tomber le compte juste');
  }
});

test('★ glyphes — aucun trait ne s’éloigne de son axe', () => {
  const LIMITE = 20;
  for (const c of BAS_DE_CASSE) {
    const e = ecartALAxe(TRAITS[c].traits, AXES[c]);
    assert.ok(e < LIMITE,
      `« ${c} » : le trait posé s'écarte de ${e.toFixed(1)} unités de son axe `
      + `(limite ${LIMITE}) — c'est un dessin plausible et faux`);
  }
});

/**
 * ⚠️ **LE GARDE-FOU QUI MANQUAIT — et il a manqué à trois refontes de suite.**
 *
 * Sans lui, un tracé qui ne couvre rien passe tous les contrôles : boucles
 * bonnes, traits comptés, extrémités bonnes, écart à l'axe EXCELLENT. La barre
 * du bas du `z` s'arrêtait vingt-cinq unités trop tôt et affichait la meilleure
 * fidélité de l'alphabet ; ce test l'aurait vue en une seconde, à 26,8 unités.
 *
 * ★ La borne est à VINGT-QUATRE unités, soit un vingt-cinquième de capitale.
 *   Elle laisse passer ce qui est structurel — le pire du jeu est le `r`, à 20,3
 *   unités, au carrefour où l'épaule naît du fût : là, la police fond deux
 *   traits en une masse d'encre et l'axe replié y garde un brin que ni le fût ni
 *   l'épaule ne parcourt. Aucun tracé de crayon ne peut couvrir ce brin-là sans
 *   inventer un trait. Elle n'a en revanche aucune indulgence pour un morceau de
 *   lettre qui manque.
 */
test('★ glyphes — l’axe est COUVERT, pas seulement longé', () => {
  const LIMITE = 24;
  for (const c of BAS_DE_CASSE) {
    const e = couvertureDeLAxe(TRAITS[c].traits, AXES[c]);
    assert.ok(e < LIMITE,
      `« ${c} » : l'axe reste à ${e.toFixed(1)} unités du tracé le plus proche `
      + `(limite ${LIMITE}) — un morceau de la lettre n'est pas dessiné, et la `
      + 'fidélité ne le dira jamais : un moignon posé sur l\'axe en est tout près');
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
