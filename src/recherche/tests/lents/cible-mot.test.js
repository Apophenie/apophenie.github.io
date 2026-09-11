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
/**
 * Les gestes de RELECTURE joués au verdict — lus par le CODE que chaque étape
 * porte (`scenario.js › poserBloc`), pas par la forme de l'op : un César joué en
 * retouche rend lui aussi des lettres, et ce n'est pas une relecture. On garde,
 * dans ces étapes-là, les ops qui rendent une lettre : la case d'une table
 * (réglette à rebours, relectures par paires) ou la touche désignée.
 */
const RELECTURES = new Set(['m1a', 'mcaz', 'mcqw', 'm1a2', 'mpol', 'mtap']);
const relus = (sc) => sc.steps.filter((s) => RELECTURES.has(s.code)).flatMap((s) => s.ops)
  .filter((o) => o.to && /^[a-z]$/.test(String(o.to.text)));

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

/* ══════════════════════ 2. Les exemples de l'auteur ══════════════════════
 *
 * « Sarah Kerrigan → Zerg, → Terran, → Ghost, → Fantome. » Puis : « j'ai
 * testé avec d'autres mots […] et aucune route ».
 *
 * ★ ZERG, GHOST, TERRAN — et DIABLE, qu'aucune relecture n'ouvrait avant les
 *   relectures par paires — sont ATTEINTS. Ce qui les ouvre est toujours la même
 *   chose : une relecture dont la suite inverse est faite de CHIFFRES de 0 à 9
 *   (coordonnées de clavier, rang sur deux chiffres, carré de Polybe,
 *   multi-tap), que l'outillage chiffré sait écrire — par l'absorption, le plus
 *   souvent : `fl+masc+mab`, les lettres de la saisie en codes ASCII, fondus
 *   sans perte dans la suite visée.
 *
 * ★ FANTOME reste hors de portée depuis « Sarah Kerrigan », et c'est la
 *   LONGUEUR DE LA LIGNE qui l'arrête, pas celle du mot : sept lettres font
 *   quatorze chiffres dans toutes les relectures, et l'absorption — par où
 *   passent toutes ces voies — n'écrit qu'un chiffre visé pour trois ou quatre
 *   chiffres de ligne (`mappeurs.js › plafondDAbsorption`, qui porte la mesure).
 *   Les lignes de « Sarah Kerrigan » font trente-six chiffres au plus (l'ASCII
 *   de treize lettres) : de sept à onze chiffres écrits, jamais quatorze.
 *   Depuis une saisie plus longue, Fantome est atteint (`https://hope-hope-hope.fr/`,
 *   voir la routine). Écrire par TRONÇONS — une portée par morceau — n'y
 *   changerait rien : découper la ligne n'ajoute pas un chiffre à la matière.
 */
test('cible-mot — Sarah Kerrigan → Zerg, par les coordonnées de clavier entre autres', () => {
  const r = moteur.resoudre('Sarah Kerrigan', { cible: 'Zerg' });
  assert.ok(r.approches.length >= 1, 'aucune voie vers Zerg');
  assert.ok(r.approches.some((a) => ['mcaz', 'mcqw'].includes(a.relecture.code)),
    'la relecture que l’auteur a proposée garde ses voies à côté des paires');
  for (const a of r.approches) assert.match(a.url, new RegExp(`#${encoderTexte('Zerg')}$`));
  verifierVoies('Sarah Kerrigan', r, 'zerg');
});

test('cible-mot — Sarah Kerrigan → Ghost', () => {
  const r = moteur.resoudre('Sarah Kerrigan', { cible: 'Ghost' });
  assert.ok(r.approches.length >= 1, 'aucune voie vers Ghost');
  verifierVoies('Sarah Kerrigan', r, 'ghost');
});

test('cible-mot — Sarah Kerrigan → Terran, douze chiffres', () => {
  const r = moteur.resoudre('Sarah Kerrigan', { cible: 'Terran' });
  assert.ok(r.approches.length >= 1, 'aucune voie vers Terran');
  verifierVoies('Sarah Kerrigan', r, 'terran');
});

test('cible-mot — Sarah Kerrigan → Diable, que seules les relectures par paires ouvrent', () => {
  const r = moteur.resoudre('Sarah Kerrigan', { cible: 'Diable' });
  assert.ok(r.approches.length >= 1, 'aucune voie vers Diable');
  assert.ok(r.approches.every((a) => ['m1a2', 'mpol', 'mtap'].includes(a.relecture.code)),
    'ni le rang ni le clavier n’y mènent : ce sont les paires qui l’ouvrent');
  // Le diagnostic dit, relecture par relecture, ce qui a été tenté.
  const clavier = r.relectures.find((x) => x.code === 'mcaz');
  assert.equal(clavier.voies, 0);
  verifierVoies('Sarah Kerrigan', r, 'diable');
});

test('cible-mot — Sarah Kerrigan → Fantome', {
  todo: 'quatorze chiffres dans toutes les relectures — voir le pavé au-dessus',
}, () => {
  const r = moteur.resoudre('Sarah Kerrigan', { cible: 'Fantome' });
  assert.ok(r.approches.length >= 1, 'aucune voie vers Fantome');
});

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
