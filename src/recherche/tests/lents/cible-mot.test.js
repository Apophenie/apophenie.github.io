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
  // ★ « reine des lames » servait d'exemple : l'ESPACE n'avait aucune relecture.
  //   Le multi-tap l'écrit désormais (0 1). Le « œ », lui, n'est sur aucune
  //   table — ni rang, ni clavier, ni téléphone.
  const r = moteur.resoudre('Sarah Kerrigan', { cible: 'cœur' });
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
 * ★ FANTOME EST ATTEINT depuis « Sarah Kerrigan » — `fl+masb+mtri+mab`, relu
 *   par le rang sur deux chiffres : les codes ASCII des treize lettres, rangés
 *   du plus petit au plus grand, puis dissous dans les quatorze chiffres visés.
 *
 *   ⚠️ **CE PAVÉ A DIT UNE FAUSSETÉ, ET VOICI LAQUELLE.** Il affirmait que la
 *     MATIÈRE manquait : trente-six chiffres de ligne au plus, et l'absorption
 *     n'en écrit qu'un pour trois ou quatre. Le premier chiffre est exact, le
 *     second aussi — et la conclusion était fausse. « La matière, tu vas
 *     l'avoir » (l'auteur) : mesuré, la plus longue ligne fait bien trente-six
 *     chiffres, rangée ou non (aucun opérateur ne multiplie les nombres entre
 *     eux, et un produit est log-additif : il n'allonge rien). Ce qui manquait
 *     n'était pas la quantité, c'était l'ARRANGEMENT — et deux verrous de FORME
 *     l'interdisaient :
 *
 *     · `vecteursDeSix` ne déroulait qu'UN raffinage, si bien que « ranger puis
 *       absorber » n'était jamais essayé ;
 *     · `mtri` exigeait de rassembler une série ENTIÈRE de valeurs identiques —
 *       quatorze valeurs égales côte à côte pour une visée de quatorze — donc
 *       il refusait toute ligne, toujours.
 *
 *     Les deux sont levés pour les visées longues seulement (`cible.js ›
 *     CIBLE_LONGUE`), et rien ne bouge en deçà.
 *
 *   ★ **ET C'EST UN DERNIER RECOURS.** « Si des solutions courtes et élégantes
 *     sont trouvées, pas besoin de chercher les options longues et bancales,
 *     mais si rien n'est trouvé, approfondir avec le budget temps disponible
 *     est pertinent » (l'auteur). La seconde passe ne se déroule donc que si
 *     AUCUNE relecture n'a rendu de voie — Fantome la déclenche, Diable non, et
 *     le test de Diable le vérifie.
 *
 * ★ Ce qui reste vrai de la capacité : elle borne, mais plus haut qu'annoncé.
 *   PROTOSS (14 chiffres) et NUMÉROLOGIE (22) n'ont toujours pas de voie depuis
 *   cette saisie-là ; le banc les classe, et dit lequel des deux murs il touche.
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
  /* ★ **ET AUCUNE VOIE DE DERNIER RECOURS ICI** — c'est tout l'objet de la
     règle : « si des solutions courtes et élégantes sont trouvées, pas besoin
     de chercher les options longues et bancales » (l'auteur). Diable a ses sept
     voies courtes, donc la seconde passe de `vecteursDeSix` n'est jamais
     déroulée. Mesuré : déclenchée sans condition, elle en ajoutait deux par le
     QWERTY (`fl+masc+mdc3+mab`) et coûtait un tiers de temps en plus. */
  assert.ok(r.approches.every((a) => !/(mtri|mdc3|md03|meg)\+mab/.test(a.url)),
    'rien n’a été gonflé ni rangé : la liste courte se suffit');
  // Le diagnostic dit, relecture par relecture, ce qui a été tenté.
  const clavier = r.relectures.find((x) => x.code === 'mcaz');
  assert.equal(clavier.voies, 0);
  verifierVoies('Sarah Kerrigan', r, 'diable');
});

test('cible-mot — Sarah Kerrigan → Fantome, rangé puis dissous', () => {
  const r = moteur.resoudre('Sarah Kerrigan', { cible: 'Fantome' });
  assert.ok(r.approches.length >= 1, 'aucune voie vers Fantome');
  // Le geste que les deux verrous interdisaient : un rangement, PUIS une
  // absorption — deux raffinages, ce que la forme fermée ne déroulait pas.
  assert.ok(r.approches.some((a) => /mtri\+mab/.test(a.url)),
    'la voie attendue range les codes ASCII avant de les dissoudre');
  verifierVoies('Sarah Kerrigan', r, 'fantome');
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
 * ★ **IL A ÉTÉ RÉGÉNÉRÉ UNE TROISIÈME FOIS, et voici pourquoi.** La MONOTONIE
 *   du curseur (`tests/lents/monotonie.test.js`) : la réserve de qualité
 *   retirait de la file de quantité les candidats qu'elle promouvait, si bien
 *   qu'un vecteur retenu à une largeur disparaissait à la suivante. Le
 *   correctif — une promotion ne coûte plus sa place — a été arbitré par
 *   l'auteur « partout, cran 0 compris ». Un seul couple de cet instantané en
 *   bouge, `hope-hope-hope.fr → 666`, à tête inchangée (`fl+m14`, 7 843) : trois
 *   voies sortent (2 028, 1 855, 1 619), trois entrent (2 275, 7 581, 3 409).
 *   Les quatre autres couples sont identiques au caractère près. Le détail des
 *   autres saisies déplacées est dans le message du commit qui l'applique.
 *
 * ★ **IL A ÉTÉ RÉGÉNÉRÉ UNE QUATRIÈME FOIS, et voici pourquoi.** Le CRAN RAPIDE
 *   (−1, `config.js › CRAN_RAPIDE`) : la recherche cumulative part désormais du
 *   cran −1, et la liste du cran 0 est l'union de sa sélection et de celle du
 *   cran −1 — « le cran 0 publié change : il gagne les voies du cran −1 qui lui
 *   manquent, union, rien ne sort » (arbitrage de l'autrice). Un seul couple
 *   bouge, `hope-hope-hope.fr → 666`, à tête inchangée (`fl+m14`, 7 843) :
 *   20 → 26 voies, six RÉSONANCES entrent (6 369, 6 327, 5 885, 5 885, 5 382,
 *   4 699), aucune ne sort. Les quatre autres couples sont identiques au
 *   caractère près.
 *
 * ★ **IL A ÉTÉ RÉGÉNÉRÉ UNE CINQUIÈME FOIS, et voici pourquoi.** UNE PLACE PAR
 *   FAMILLE DE RÉGLAGES (`assemblage.js › moissons`, la réunion) : « les 25
 *   césars comptent pour UNE famille » (l'autrice), et « une voie ne sort
 *   jamais pour une moins bonne ». La moisson récolte aussi sur une fenêtre par
 *   famille, et ce qu'elle seule fabrique s'AJOUTE. Un seul couple bouge,
 *   `hope-hope-hope.fr → 666`, à tête inchangée (`fl+m14`, 7 843) : 26 → 27
 *   voies, une MOISSON ×6 entre au rang 3 (1 399), aucune ne sort, aucun score
 *   ne change. Les quatre autres couples sont identiques au caractère près.
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
