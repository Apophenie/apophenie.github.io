/**
 * ★ **LA RÉSERVE DE QUALITÉ PILOTÉE PAR LES CURSEURS — ce qui se vérifie sans
 *   lancer de recherche.**
 *
 * > « Idéalement, c'est les curseurs qui priorisent quelles voies méritent
 * >   d'être finalisées, donc il faudrait inclure du score intermédiaire pondéré
 * >   pour arbitrer ça. […] Le nombre de sièges en cours de recherche devrait
 * >   donc être dynamique en fonction des critères de recherche. » (l'auteur)
 *
 * Ce fichier reste en ROUTINE : il tient les fonctions de
 * `score-intermediaire.js` et la sortie de `vecteursDeSix`, qui déroule une
 * forme fermée. Le chemin RÉEL — une recherche qui trouve ou ne trouve pas la
 * voie — est tenu par `lents/sieges.test.js` : une vérification qui porterait
 * seulement ici porterait à côté.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { vecteursDeSix } from '../assemblage.js';
import { operateursExplorables } from '../bfs.js';
import { CURSEURS_DEFAUT, normaliserCurseurs } from '../score.js';
import {
  axesIntermediaires, noteDeQualite, partDesSieges, siegeDeQualite, reserveDeQualite, apresPerte,
} from '../score-intermediaire.js';
import { CATALOGUE } from '../../moteur/catalogue.js';

const OPS = operateursExplorables(CATALOGUE);
const JARDIN = 'Le jardin sur le rocher de la maison';
const codesDe = (c) => c.ops.map((o) => o.code).join('+');
const cu = (x) => normaliserCurseurs(x);

// ══════════════════════════════════ le partage des sièges

test('★ sièges — au défaut, un sur quatre, le quatrième : l’entrelacement d’avant, siège pour siège', () => {
  const part = partDesSieges(cu(CURSEURS_DEFAUT));
  for (let k = 1; k <= 64; k++) {
    assert.equal(siegeDeQualite(k, part), k % 4 === 0, `siège ${k}`);
  }
  for (const plafond of [2, 4, 8, 16, 20, 40]) {
    assert.equal(reserveDeQualite(plafond, part), Math.max(1, Math.floor(plafond / 4)), `plafond ${plafond}`);
  }
});

test('sièges — la part de la réserve suit les curseurs, et seulement leur PROPORTION', () => {
  const partDe = (x) => { const p = partDesSieges(cu(x)); return p.num / p.den; };
  assert.equal(partDe({ simplicite: 200, exhaustivite: 200, quantite: 200, coherence: 200 }), partDe({}),
    'quatre curseurs à 200 disent la même chose que quatre à 100');
  assert.ok(partDe({ simplicite: 200 }) > partDe({}), 'lever un curseur de qualité élargit la réserve');
  assert.ok(partDe({ quantite: 200 }) < partDe({}), 'lever la quantité la rétrécit');
  assert.equal(partDe({ quantite: 0 }), 1, 'quantité à zéro : tout à la réserve');
  const sansQualite = partesDe0();
  assert.equal(sansQualite.num, 0, 'les trois autres à zéro : rien à la réserve');
  assert.equal(reserveDeQualite(16, sansQualite), 0);
  assert.deepEqual(partDesSieges(cu({ simplicite: 0, exhaustivite: 0, quantite: 0, coherence: 0 })),
    partDesSieges(cu({})), 'les quatre à zéro ne disent rien : le partage du défaut, et il est dit');
});
function partesDe0() {
  return partDesSieges(cu({ simplicite: 0, exhaustivite: 0, coherence: 0 }));
}

test('sièges — tout préfixe tient sa part : l’assemblage n’en garde que la première moitié', () => {
  for (const x of [{}, { simplicite: 200 }, { quantite: 200 }, { quantite: 0 }, { coherence: 37, quantite: 151 }]) {
    const part = partDesSieges(cu(x));
    let pris = 0;
    for (let k = 1; k <= 50; k++) {
      if (siegeDeQualite(k, part)) pris++;
      assert.equal(pris, Math.floor((k * part.num) / part.den), `${JSON.stringify(x)}, préfixe ${k}`);
    }
  }
});

test('sièges — des positions non normalisées échouent bruyamment', () => {
  assert.throws(() => partDesSieges({ simplicite: 1.5, exhaustivite: 100, quantite: 100, coherence: 100 }));
  assert.throws(() => partDesSieges({ simplicite: -1, exhaustivite: 100, quantite: 100, coherence: 100 }));
});

// ══════════════════════════════════ la note

const vecteurs = (curseurs) => vecteursDeSix(JARDIN, OPS, 3, 16, '666', curseurs ? { curseurs } : {});
const cheminDe = (codes) => {
  const c = vecteursDeSix(JARDIN, OPS, 3, 400, '666').find((x) => codesDe(x) === codes);
  assert.ok(c, `${codes} doit être fabriqué`);
  return c;
};

/**
 * ⚠️ **UNE SUPPRESSION ÉLÉGANTE RESTE UNE SUPPRESSION** — « et réduit
 *   l'exhaustivité » (l'auteur). Les articles et la préposition sont écartés
 *   par une règle nommée : ils ne sont pas lus pour autant.
 */
test('★ note — les caractères écartés par une règle ne sont PAS lus, et ce sont des caractères, pas des jetons', () => {
  const ax = axesIntermediaires(cheminDe('fart+fprp+tm+mlm'), JARDIN, '666');
  // « jardin rocher maison » : 18 lettres lues sur 29, soit une perte de 380 ‰ ;
  // le vecteur [6 6 6] est gardé tout entier, rendement plein.
  const lecture = apresPerte(1000 - Math.floor((18 * 1000) / 29));
  assert.ok(lecture < 1000, 'la perte se paie');
  assert.equal(ax.exhaustivite, Math.floor((400 * lecture + 400 * 1000) / 800));
  // En JETONS, elle aurait lu 3 sur 29 : la perte serait de 897 ‰.
  assert.ok(ax.exhaustivite > Math.floor((400 * apresPerte(897) + 400 * 1000) / 800),
    'la lecture se compte en caractères signifiants');
  // …et la voie qui lit tout n'est pas punie de ce qu'elle lit.
  assert.equal(axesIntermediaires(cheminDe('fl+tca+msen+mrdE'), JARDIN, '666').exhaustivite, 1000);
});

test('note — entière, et pondérée par les trois curseurs qui nomment ses axes, rien d’autre', () => {
  const ax = { simplicite: 880, exhaustivite: 769, coherence: 827 };
  assert.equal(noteDeQualite(ax, cu({})), Math.floor((880 + 769 + 827) / 3));
  assert.equal(noteDeQualite(ax, cu({ simplicite: 200 })), Math.floor((2 * 880 + 769 + 827) / 4));
  assert.equal(noteDeQualite(ax, cu({ quantite: 0 })), noteDeQualite(ax, cu({ quantite: 200 })),
    'la quantité a sa file : elle ne pèse pas sur la note');
  assert.equal(noteDeQualite(ax, cu({ simplicite: 0, exhaustivite: 0, coherence: 0 })), 0);
});

// ══════════════════════════════════ la réserve, dans `vecteursDeSix`

test('★ réserve — au défaut, les curseurs ne changent rien : le pré-tri historique, au bit près', () => {
  const trace = (v) => v.map(codesDe).join(' ');
  assert.equal(trace(vecteurs(CURSEURS_DEFAUT)), trace(vecteurs()),
    'des curseurs explicitement au défaut rendent la sortie sans curseurs');
});

test('★ réserve — simplicité à 200 : les voies courtes sont finalisées en priorité', () => {
  const garde = vecteurs({ simplicite: 200 }).slice(0, 8).map(codesDe);
  assert.ok(garde.includes('tm+mlm'), `deux gestes, la longueur des mots : ${garde.join('  ')}`);
  assert.ok(!vecteurs().slice(0, 8).map(codesDe).includes('tm+mlm'), 'au défaut, le pré-tri ne la gardait pas');
});

test('★ réserve — exhaustivité et cohérence à 150 : la voie grammaticale est finalisée', () => {
  const garde = vecteurs({ exhaustivite: 150, coherence: 150 }).slice(0, 8).map(codesDe);
  assert.ok(garde.includes('fart+fprp+tm+mlm'), `rendement plein, aucune bidouille : ${garde.join('  ')}`);
});

/**
 * « Une approche addition uniquement, EN PLUS de `mab`, pas à la place »
 * (l'auteur). Le second élu chassait le premier de la moitié gardée ; quand les
 * curseurs pilotent la réserve, il ne chasse plus qu'un siège de quantité.
 * (Au défaut, le comportement historique est gardé : voir `vecteursDeSix`.)
 */
/* ★ **SUR LE CATALOGUE COMPLET — et l'absorption cède sa place, c'est voulu.**
     Le 18 septembre 2026, `mas` et `mu8` ont fabriqué sur cette phrase deux
     voies courtes, sans absorption (`fmaj+tca+mas+mdc3` et `+mdc2` : la phrase
     en capitales, espaces codés), qui passent devant `fc+tca+masc+mab` : elle
     tombait de la 5ᵉ à la 10ᵉ place, hors de la moitié gardée sous deux des
     trois réglages. Le test s'était replié un temps sur le catalogue d'avant
     ces deux codes, pour ne pas trancher à la place de l'autrice. Elle a
     tranché :

     > « ça m'a l'air d'être une bonne nouvelle, mab est un dernier recours, à
     >   éviter quand on peut, donc que d'autres passent devant me va très
     >   bien. » (l'autrice, 18 septembre 2026)

     Le test tient donc, sur le catalogue COMPLET, ce qui est voulu : les deux
     élus sans perte restent gardés ensemble ; l'absorption reste PROPOSÉE
     (« en plus de `mab`, pas à la place »), mais derrière les voies qui s'en
     passent ; et là où elle sort des huit places, ce sont des voies sans
     absorption qui les tiennent. */
const ABSORBE = /\+mab[xd]?(\+|$)/;

test('★ élus — curseurs personnalisés : les deux voies sans perte sont gardées ensemble', () => {
  for (const x of [{ simplicite: 200 }, { exhaustivite: 200 }, { coherence: 150 }]) {
    const liste = vecteurs(x).map(codesDe);
    const garde = liste.slice(0, 8);
    const dit = `${JSON.stringify(x ?? {})} : ${garde.join('  ')}`;
    /* ★ **L'ÉLU SANS PERTE EST DÉSORMAIS UNE VOIE HONNÊTE.** Il s'appelait
       `tm+mlm+mab` — une absorption, donc une ficelle. Depuis que la potence
       `mdc*` n'écrit plus ses zéros de tête (décision de l'auteur),
       `fr1+tsy+mlm+mdc2` écrit `6 6 6` d'un trait là où elle écrivait
       `6 0 6 6` : une voie SANS FICELLE qui rend la cible sans rien jeter. Les
       règles de l'auteur la préfèrent — « le moins de ficelles d'abord » pour
       l'élu, « une ficelle qui n'apporte rien n'est pas proposée » pour
       l'absorption qu'elle rend superflue. La preuve est le test suivant :
       rendue à l'ancien comportement, la même liste retrouve `tm+mlm+mab`. */
    assert.ok(garde.includes('fr1+tsy+mlm+mdc2'), `la voie sans perte : ${dit}`);
    assert.ok(garde.includes('fl+tca+msen+mrdE'), `la voie additive : ${dit}`);
    // « Une approche addition uniquement, EN PLUS de `mab`, pas à la place » :
    // l'absorption reste proposée — plus loin, s'il le faut.
    const rang = liste.findIndex((c) => c.endsWith('+mab'));
    assert.ok(rang >= 0, `une absorption reste proposée : ${liste.join('  ')}`);
    // « mab est un dernier recours » : les deux voies des codes de caractère,
    // qui s'en passent, la devancent…
    for (const v of ['fmaj+tca+mas+mdc3', 'fmaj+tca+mas+mdc2']) {
      const r = liste.indexOf(v);
      assert.ok(r >= 0 && r < rang, `${v} devance l’absorption : ${liste.join('  ')}`);
    }
    // …et quand elle sort des huit places, ce sont des voies SANS absorption
    // qui les tiennent.
    if (rang >= 8) assert.ok(garde.every((c) => !ABSORBE.test(c)), `huit places sans absorption : ${dit}`);
  }
  // Le constat du 18 septembre, tel que mesuré : sous la simplicité et la
  // cohérence levées, l'absorption n'est plus dans les huit places.
  for (const x of [{ simplicite: 200 }, { coherence: 150 }]) {
    const garde = vecteurs(x).slice(0, 8).map(codesDe);
    assert.ok(!garde.some((c) => ABSORBE.test(c)), `${JSON.stringify(x)} : ${garde.join('  ')}`);
  }
});

/**
 * ★ **LA PREUVE QUE SEUL LE SENS DE `mdc*` A CHANGÉ.** Retirer `mdc*` des
 * explorables et garder `md0*` — la potence à zéros de tête, c'est-à-dire ce
 * que `mdc*` faisait avant — rend exactement l'ancienne liste, `tm+mlm+mab`
 * compris. Deux choses sont tenues par là : l'élu a changé pour la raison dite
 * au test précédent et pour nulle autre, et `md0*` ne prend pas un siège de
 * plus à côté de `mdc*` (`assemblage.js › formeDe` : une forme, deux réglages).
 */
test('élus — rendue à l’ancienne potence, la liste retrouve l’absorption sans perte', () => {
  const OPS_ANCIENNE = OPS.filter((o) => !/^mdc\d$/.test(o.code));
  for (const x of [{ simplicite: 200 }, { exhaustivite: 200 }, { coherence: 150 }]) {
    const fenetre = vecteursDeSix(JARDIN, OPS_ANCIENNE, 3, 16, '666', { curseurs: x }).map(codesDe);
    const garde = fenetre.slice(0, 8);
    assert.ok(garde.includes('tm+mlm+mab'), `${JSON.stringify(x)} : ${garde.join('  ')}`);
    assert.ok(garde.includes('fl+tca+msen+mrdE'), `${JSON.stringify(x)} : ${garde.join('  ')}`);
    /* Une potence par nombre de décimales, pas une par réglage — lu sur la
       fenêtre ENTIÈRE. Depuis le troisième élu (la voie courte qui lit tout,
       ici `fl+tca+m14`, posée à la fin de la moitié gardée), la seconde potence
       peut passer juste derrière la coupe : ce n'est pas un réglage de trop
       qu'on compterait, c'est une place prise par l'élu. */
    const potences = fenetre.filter((c) => /\+md0\d$/.test(c) && c.startsWith('fl+tca+masc+'));
    assert.deepEqual(potences.sort(), ['fl+tca+masc+md02', 'fl+tca+masc+md03'],
      'une potence par nombre de décimales, pas une par réglage');
    assert.ok(garde.includes('fl+tca+m14'), `l’élu court : ${garde.join('  ')}`);
  }
});
