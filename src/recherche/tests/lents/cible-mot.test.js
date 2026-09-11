/** La CIBLE TEXTUELLE, cherchée pour de vrai — `cible.js`, « la cible textuelle ».
 *
 *  Trois choses ici, et la troisième n'est pas la moins importante :
 *
 *   1. un mot se VISE — la recherche trouve, le lien se rejoue, la scène
 *      compile et annonce le mot ;
 *   2. les quatre exemples de l'auteur, et ce que la mesure en dit ;
 *   3. la NON-RÉGRESSION : les cibles chiffrées rendent exactement la liste
 *      d'avant ce chantier.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { creerMoteur } from '../../index.js';
import { lire } from '../../url.js';
import { catalogue } from '../_catalogue.js';
import { compile } from '../../../visuel/compile.js';

const moteur = creerMoteur(catalogue, { filetTemporel: false });
const codesDe = (a) => a.parts.map((p) => p.chemin.ops.map((o) => o.code).join('+')).join(',');

/* ══════════════════════════ 1. Un mot se vise ══════════════════════════ */

test('cible-mot — « Zerg » s’écrit ZERG : chaque voie se rejoue, se compile et l’annonce', () => {
  const r = moteur.resoudre('Zerg', { cible: 'Zerg' });
  assert.equal(r.cible.texte, 'zerg');
  assert.ok(r.approches.length >= 1, 'au moins une voie');
  assert.ok(r.approches.some((a) => codesDe(a) === 'tca+ma1'),
    'la plus simple : chaque lettre vaut son rang, et le rang redevient la lettre');
  for (const a of r.approches) {
    assert.match(a.url, /^#so!czerg!/, 'sobre : un mot n’a pas encore d’emblème');
    assert.equal(moteur.rejouer(lire(a.url)).approche.url, a.url, `${a.url} se rejoue`);
    const sc = moteur.scenarioDe(a, { saisie: 'Zerg', cible: r.cible });
    assert.equal(sc.result, 'ZERG', a.url);
    // ★ Juste et compilable ne suffit pas : un geste rejeté est remplacé EN
    //   SILENCE par une substitution générique, et seul `avertissements` le
    //   dit (la potence de `mdc*` a disparu ainsi, sous trois tests verts).
    assert.equal(sc.avertissements, undefined, `${a.url} : ${(sc.avertissements || []).join(' | ')}`);
    // Et la réglette à rebours est JOUÉE au verdict : une case par lettre,
    // dans l'ordre du mot.
    const relus = sc.steps.flatMap((st) => st.ops).filter((o) => o.op === 'table' && o.ordre === '1a26');
    assert.equal(relus.map((o) => o.to.text).join(''), 'ZERG', `${a.url} : réglette de m1a absente ou incomplète`);
    assert.doesNotThrow(() => compile(sc), a.url);
  }
});

test('cible-mot — « Sarah Kerrigan » vise ses propres mots, par la portée et sans rien jeter', () => {
  for (const mot of ['Sarah', 'Kerrigan']) {
    const r = moteur.resoudre('Sarah Kerrigan', { cible: mot });
    assert.ok(r.approches.length >= 1, mot);
    for (const a of r.approches) {
      // Un mot est une cible hétérogène : le refus des suppressions en fin de
      // chemin s'y applique tel quel (`elegance.js › elagueALaFin`).
      assert.equal((a.bilan && a.bilan.jeteesAuTri) || 0, 0, `${mot} : ${a.url}`);
    }
  }
});

test('cible-mot — casse et accents ne changent pas la liste', () => {
  const liste = (cible) => moteur.resoudre('Sarah Kerrigan', { cible }).approches.map((a) => a.url);
  assert.deepEqual(liste('SARAH'), liste('sarah'));
  assert.deepEqual(liste('Sàrah'), liste('sarah'));
});

/* ══════════════════════ 2. Les quatre exemples de l'auteur ══════════════════════
 *
 * « Sarah Kerrigan → Zerg, → Terran, → Ghost, → Fantome. » Aucun n'est
 * atteignable avec le catalogue actuel, et ce n'est pas faute d'avoir cherché.
 * Mesuré de quatre façons, avant d'écrire la cible textuelle :
 *
 *  1. RÉAGENCEMENT + FILTRE : « Sarah Kerrigan » n'a ni Z (Zerg), ni T (Terran,
 *     Ghost, Fantome), ni O (Ghost, Fantome), ni F, ni M. Un filtre retire, il
 *     ne fait pas apparaître.
 *  2. UN PROGRAMME D'UN SEUL TENANT — tout le catalogue actif, plus la relecture
 *     des rangs en lettres (et même le tour de l'alphabet, 27 → A) : 22 500
 *     états à profondeur 4, aucun n'écrit l'un des quatre mots, ni même son
 *     anagramme exact.
 *  3. MOT PAR MOT — « Sarah » par un programme, « Kerrigan » par un autre,
 *     bout à bout : aucune paire. Un mot seul, l'autre laissé : rien non plus.
 *  4. L'ASSEMBLAGE AUX RANGS — le moteur complet, ce qu'éprouvent les tests
 *     ci-dessous : aucune approche.
 *
 * ★ Une seule piste ouvre un exemple : une FUSION COUVRANTE aux rangs — le
 *   vecteur découpé en paquets contigus, tout couvert, dont les SOMMES écrivent
 *   les rangs du mot (la généralisation de `mrdE`, « sans rien perdre »). Elle
 *   donne ZERG par `fr18+fc+tca+masb+mdc1`, puis 26 | 5 | 18 | 7 ; rien pour les
 *   trois autres. C'est un opérateur à écrire, pas un réglage.
 *
 * ★ Et « Fantome », traduction de « Ghost », ne viendra pas d'une traduction :
 *   le dictionnaire (FreeDict, GÉNÉRÉ, « jamais écrit à la main ») rend `ghost`
 *   par `apparition`. Y ajouter « fantôme » pour faire tomber l'exemple serait
 *   exactement le reproche que ce dictionnaire existe pour ne pas mériter.
 *
 * Ils restent donc en `todo` : leur échec est RAPPORTÉ, il ne fait pas tomber
 * la suite, et le jour où le catalogue les atteint honnêtement il suffira
 * d'ôter le `todo`. Les forcer serait faire ce que le site dénonce.
 */
for (const mot of ['Zerg', 'Terran', 'Ghost', 'Fantome']) {
  test(`cible-mot — Sarah Kerrigan → ${mot}`, {
    todo: 'inatteignable par une voie honnête avec le catalogue actuel — voir le pavé au-dessus',
  }, () => {
    const r = moteur.resoudre('Sarah Kerrigan', { cible: mot });
    assert.ok(r.approches.length >= 1, `aucune voie vers ${mot.toUpperCase()}`);
  });
}

/* ══════════════════════ 3. Non-régression des cibles chiffrées ══════════════════════
 *
 * L'instantané a été pris sur `main` (commit 75e5bc3), AVANT la première ligne
 * de ce chantier : pour chaque couple, la liste entière — lien, score, séries,
 * mode —, dans l'ordre. La cible textuelle ajoute un opérateur au catalogue et
 * une branche au verdict ; ni l'un ni l'autre ne doit toucher une cible faite de
 * chiffres, et c'est ici qu'on le vérifie à l'octet.
 *
 * ⚠️ C'est un fil tendu, pas une spécification. Une évolution VOULUE du barème
 *   ou du classement le fera rougir : c'est alors l'instantané qu'on régénère,
 *   après avoir vérifié que ce qui bouge est ce qu'on voulait faire bouger.
 */
const INSTANTANE = JSON.parse(readFileSync(
  new URL('./instantane-cibles-chiffrees.json', import.meta.url), 'utf8',
));
for (const [couple, attendu] of Object.entries(INSTANTANE)) {
  test(`cible-mot — non-régression : ${couple}`, () => {
    const [saisie, cible] = couple.split(' → ');
    const r = moteur.resoudre(saisie, { cible });
    assert.deepEqual(r.approches.map((a) => [a.url, a.score, a.series ?? null, a.mode]), attendu);
  });
}
