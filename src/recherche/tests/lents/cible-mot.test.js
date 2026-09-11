/** La CIBLE TEXTUELLE, cherchée pour de vrai — `cible.js`, « la cible textuelle ».
 *
 *  Trois choses ici, et la troisième n'est pas la moins importante :
 *
 *   1. un texte se VISE — par ses relectures ; chaque voie se rejoue, joue sa
 *      relecture au verdict sans qu'aucun geste soit remplacé en silence, et
 *      se compile ;
 *   2. les quatre exemples de l'auteur, et ce que la mesure en dit ;
 *   3. la NON-RÉGRESSION : les cibles chiffrées rendent exactement la liste
 *      d'avant ce chantier.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { creerMoteur } from '../../index.js';
import { lire, ecrire } from '../../url.js';
import { encoderTexte } from '../../base58.js';
import { catalogue } from '../_catalogue.js';
import { compile } from '../../../visuel/compile.js';

const moteur = creerMoteur(catalogue, { filetTemporel: false });

/** Les gestes de RELECTURE joués au verdict : la réglette à rebours ou le clavier. */
const relus = (sc) => sc.steps.flatMap((s) => s.ops)
  .filter((o) => (o.op === 'table' && o.ordre === '1a26') || (o.op === 'keyboard' && o.mesure === 'coordonnees'));

/**
 * Toute voie vers un texte, vérifiée de bout en bout : le lien se rejoue à
 * l'identique, la scène n'a aucun geste remplacé en silence, la relecture est
 * JOUÉE et écrit ce que le verdict annonce, et le moteur visuel compile.
 */
function verifierVoies(saisie, r, ecrit) {
  for (const a of r.approches) {
    const lecture = lire(a.url);
    const rejeu = moteur.rejouer(lecture);
    assert.equal(rejeu.ok, true, `${a.url} : ${rejeu.raison || ''}`);
    assert.equal(rejeu.approche.url, a.url, `${a.url} se rejoue à l’identique`);
    const sc = moteur.scenarioDe(a, { saisie, cible: r.cible });
    assert.equal(sc.avertissements, undefined, `${a.url} : ${(sc.avertissements || []).join(' | ')}`);
    assert.equal(sc.result.split(' ')[0], ecrit, a.url);
    assert.equal(relus(sc).map((o) => o.to.text).join(''), sc.result.replace(/ /g, ''),
      `${a.url} : la relecture est jouée, lettre par lettre`);
    assert.doesNotThrow(() => compile(sc), a.url);
  }
}

/* ══════════════════════════ 1. Un texte se vise ══════════════════════════ */

test('cible-mot — « Zerg » depuis « Zerg » : le rang, puis la lettre — à la capitale près', () => {
  const r = moteur.resoudre('Zerg', { cible: 'Zerg' });
  assert.equal(r.cible.texte, 'Zerg');
  assert.ok(r.approches.some((a) => a.relecture.code === 'm1a'
    && a.parts.length === 1 && a.parts[0].chemin.ops.map((o) => o.code).join('+') === 'tca+ma1'),
  'la plus simple : chaque lettre vaut son rang, et le rang redevient la lettre');
  for (const a of r.approches) assert.equal(a.ecartDeForme.facteur, 970, 'zerg pour Zerg');
  verifierVoies('Zerg', r, 'zerg');
});

test('cible-mot — casse et accents : la même recherche, un écart payé autrement', () => {
  const programmes = (r) => r.approches.map((a) => a.url.split('#')[1]);
  const exacte = moteur.resoudre('Sarah Kerrigan', { cible: 'sarah' });
  const capitales = moteur.resoudre('Sarah Kerrigan', { cible: 'SARAH' });
  assert.ok(exacte.approches.length >= 1);
  assert.deepEqual(programmes(capitales), programmes(exacte), 'les mêmes voies, dans le même ordre');
  exacte.approches.forEach((a, i) => {
    assert.equal(a.ecartDeForme.facteur, 1000, 'sarah pour « sarah » : rien à payer');
    assert.equal(capitales.approches[i].ecartDeForme.facteur, 900, 'sarah pour « SARAH » : la casse');
  });
});

test('cible-mot — un signe qu’aucune relecture n’écrit : aucune voie, et la liste dit pourquoi', () => {
  const r = moteur.resoudre('Sarah Kerrigan', { cible: 'reine des lames' });
  assert.equal(r.approches.length, 0);
  assert.deepEqual(r.relectures, []);
  assert.ok(r.avertissement && r.avertissement.fr, 'la raison est écrite, pas devinée');
});

/* ══════════════════════ 2. Les quatre exemples de l'auteur ══════════════════════
 *
 * « Sarah Kerrigan → Zerg, → Terran, → Ghost, → Fantome. »
 *
 * ★ ZERG et GHOST sont ATTEINTS — par les coordonnées de clavier (`mcaz`,
 *   `mcqw`), la relecture que l'auteur a proposée. « Zerg » vaut `21314152`
 *   en AZERTY (`13314152` en QWERTY), « Ghost » `5262912251` dans les deux :
 *   des cibles chiffrées ordinaires, que le moteur écrit par l'absorption
 *   (`mab`, `mrdE`) — par exemple `fl+masb+mrdE`, les lettres de la saisie en
 *   codes ASCII du bas de casse, fondues dans la cible sans rien jeter.
 *
 * ★ TERRAN et FANTOME restent hors de portée, et ce n'est pas faute d'avoir
 *   cherché. Mesuré, avant et après les relectures :
 *
 *   · RÉAGENCEMENT + FILTRE : « Sarah Kerrigan » n'a ni T, ni O, ni F, ni M.
 *   · CHIFFREMENT PUIS RETRAIT NOMMÉ (les 25 césars et l'atbash, sur la saisie
 *     entière ou un seul mot, puis jusqu'à six filtres nommés) : les lettres de
 *     TERRAN apparaissent — `fr1` sur « Sarah » donne « Tbsbi Kerrigan », T,
 *     E, R, R, A, N dans l'ordre —, mais aucun retrait nommé n'ôte le surplus :
 *     sept lettres de trop au plus près. Celles de FANTOME n'apparaissent
 *     jamais toutes (il manque O et M). ZERG, par cette famille, garde quatre
 *     lettres de trop au mieux (« Z Kerigan »), GHOST n'est jamais dans l'ordre.
 *   · LES RELECTURES : en rangs, `20 5 18 18 1 14` et `6 1 14 20 15 13 5` —
 *     des valeurs au-delà de 9, que les opérateurs d'absorption ne visent pas ;
 *     en coordonnées, douze et quatorze chiffres (une colonne 10 pour le M de
 *     Fantome en AZERTY) : au-delà de dix, les modes à fragments ne peuvent
 *     plus les écrire, et aucun vecteur ne tombe juste.
 *
 * Ce qu'il faudrait ajouter : une absorption qui vise des VALEURS (des rangs
 *   de 1 à 26) et non des chiffres — la généralisation de `mab`/`mrdE`, qui
 *   ouvrirait les relectures par le rang ; ou une relecture plus compacte (un
 *   seul chiffre par lettre, au prix de l'injectivité). Aucune ne se décrète
 *   ici.
 */
test('cible-mot — Sarah Kerrigan → Zerg, par les coordonnées de clavier', () => {
  const r = moteur.resoudre('Sarah Kerrigan', { cible: 'Zerg' });
  assert.ok(r.approches.length >= 1, 'aucune voie vers Zerg');
  assert.ok(r.approches.some((a) => ['mcaz', 'mcqw'].includes(a.relecture.code)));
  for (const a of r.approches) assert.match(a.url, new RegExp(`#${encoderTexte('Zerg')}$`));
  verifierVoies('Sarah Kerrigan', r, 'zerg');
});

test('cible-mot — Sarah Kerrigan → Ghost, par les coordonnées de clavier', () => {
  const r = moteur.resoudre('Sarah Kerrigan', { cible: 'Ghost' });
  assert.ok(r.approches.length >= 1, 'aucune voie vers Ghost');
  verifierVoies('Sarah Kerrigan', r, 'ghost');
});

for (const mot of ['Terran', 'Fantome']) {
  test(`cible-mot — Sarah Kerrigan → ${mot}`, {
    todo: 'inatteignable par une voie honnête avec le catalogue actuel — voir le pavé au-dessus',
  }, () => {
    const r = moteur.resoudre('Sarah Kerrigan', { cible: mot });
    assert.ok(r.approches.length >= 1, `aucune voie vers ${mot}`);
  });
}

/* ══════════════════════ 3. Non-régression des cibles chiffrées ══════════════════════
 *
 * L'instantané fixe, pour chaque couple, la liste entière — lien, score,
 * séries, mode —, dans l'ordre.
 *
 * ★ **IL A ÉTÉ RÉGÉNÉRÉ UNE FOIS, et voici pourquoi.** Pris d'abord sur `main`
 *   (75e5bc3), avant la première ligne de ce chantier, il a tenu à l'identique
 *   après la fusion des deux branches — vérifié sur 7d39c32, dans un worktree
 *   jetable. Il a rougi ensuite pour UNE raison, démontrée : la correction du
 *   siège chassé de la réserve de qualité (`assemblage.js`), appliquée partout
 *   sur décision de l'auteur — « il me semblerait pertinent de le corriger
 *   partout ». Quatre couples sur cinq ont changé, et deux têtes de liste avec
 *   eux : Sarah Kerrigan → 13 (la moisson `nm,nv` cède à `fl+tm+mlm+mmoc`) et
 *   → 007 (`fc+ma1+mdvq+mrdE` cède à `fl+msfr+mab`). Ce n'était pas une
 *   régression de la cible textuelle : c'était une évolution VOULUE du
 *   classement, exactement le cas prévu plus bas.
 *
 * ★ Les liens des cibles autres que 666 s'écrivent désormais autrement : la
 *   cible est passée derrière un troisième `#` (`url.js`). On compare donc le
 *   lien d'avant RÉÉCRIT par la grammaire d'aujourd'hui — `ecrire(lire(…))` —
 *   au lien d'aujourd'hui : même programme, même saisie, même cible, seule
 *   l'écriture a changé. Pour 666, les deux sont identiques au caractère près.
 *
 * ★ **IL A ÉTÉ RÉGÉNÉRÉ UNE SECONDE FOIS, et voici pourquoi.** Branche
 *   `potence-zero-initial`, sur deux décisions de l'auteur : la potence `mdc*`
 *   n'écrit plus ses zéros de tête (l'ancien comportement a pris les codes
 *   `md0*`), et deux mots peuvent se LIER par une division (`=mdl0!`, « James
 *   Bond » → 007). Les cinq couples ont changé, et UNIQUEMENT par là :
 *   - les voies `…+mdc3` changent de score (Sarah Kerrigan → 666, hope → 666) ;
 *   - des voies à liaison entrent en tête des cibles demandées (Sarah
 *     Kerrigan → 13 et → 007, Donald Trump → 111) ;
 *   - ce qui tombe du bas d'une liste pleine en conséquence.
 *   PROUVÉ deux fois, dans des worktrees jetables : l'ancienne potence rétablie
 *   à l'identique (code, id, coût, sans `md0*` ni `mdl*`) rend cet instantané au
 *   caractère près ; et un bilan entrée par entrée ne laisse AUCUNE différence
 *   qui ne touche la potence ou la liaison. Ce bilan a d'abord trouvé deux
 *   moissons sans rapport : c'était un défaut (un champ `forme` réemployé, voir
 *   `assemblage.js › formeDe`), corrigé AVANT de régénérer.
 *
 * ⚠️ C'est un fil tendu, pas une spécification. Une évolution VOULUE du barème
 *   ou du classement le fera rougir : c'est alors l'instantané qu'on régénère.
 */
const INSTANTANE = JSON.parse(readFileSync(
  new URL('./instantane-cibles-chiffrees.json', import.meta.url), 'utf8',
));
const reecrire = (url) => {
  const l = lire(url);
  return ecrire({
    saisie: l.saisie, fragments: l.fragments, retouches: l.retouches,
    registre: l.registre, cible: l.cible, curseurs: l.curseurs, fouille: l.fouille,
    // la LIAISON (`=mdl0!`) fait partie du lien : la taire le réécrirait faux
    liaison: l.liaison,
  });
};
for (const [couple, attendu] of Object.entries(INSTANTANE)) {
  test(`cible-mot — non-régression : ${couple}`, () => {
    const [saisie, cible] = couple.split(' → ');
    const r = moteur.resoudre(saisie, { cible });
    assert.deepEqual(
      r.approches.map((a) => [a.url, a.score, a.series ?? null, a.mode]),
      attendu.map(([url, score, series, mode]) => [reecrire(url), score, series, mode]),
    );
    if (cible === '666') {
      assert.deepEqual(r.approches.map((a) => a.url), attendu.map(([url]) => url),
        'pour 666, le lien est celui d’avant, au caractère près');
    }
  });
}
