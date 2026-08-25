/**
 * ★ L'ORAGE SONORE — la dérivation, la licence, et la politique du silence.
 *
 * Trois choses sont vérifiées ici, et aucune ne se verrait en relisant du code :
 *
 *  1. **`src/sons/data.js` n'a pas dérivé des `.ogg`.** C'est une donnée
 *     ENGENDRÉE ; sans ce test, on pourrait remplacer un son sans réencoder,
 *     ou éditer le base64 à la main, et la licence citée à côté ne
 *     correspondrait plus à ce qui sort des haut-parleurs. Même garde que
 *     `bun run segments:check` pour la géométrie des afficheurs.
 *  2. **chaque son est documenté**, avec sa source, son auteur et sa licence.
 *     CC0 n'exige aucune attribution : c'est précisément pour ça qu'un test
 *     est nécessaire — rien d'autre ne rappellerait de l'écrire.
 *  3. **le son est coupé par défaut**, et le registre sobre n'en charge aucun.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as data from '../sons/data.js';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dossier = resolve(racine, 'src/sons');
const NOMS = ['abime', 'effroi', 'tonnerre', 'brasier'];

/* ═════════════════════ 1. LA DÉRIVATION ══════════════════════════════════ */

test('★ sons — le base64 servi EST celui des .ogg, octet pour octet', () => {
  for (const nom of NOMS) {
    const attendu = readFileSync(resolve(dossier, `${nom}.ogg`)).toString('base64');
    const servi = data[nom];
    assert.equal(typeof servi, 'string', `« ${nom} » manque dans data.js`);
    assert.ok(servi.startsWith('data:audio/ogg;base64,'),
      `« ${nom} » doit être une URL de données Ogg — sinon rien ne garantit qu'aucune requête ne parte`);
    assert.equal(servi.slice('data:audio/ogg;base64,'.length), attendu,
      `« ${nom} » a dérivé de son fichier. Relancez \`bun run sons\`.`);
  }
});

test('sons — les quatre .ogg sont bien de l’Opus, et rien d’autre', () => {
  for (const nom of NOMS) {
    const tete = readFileSync(resolve(dossier, `${nom}.ogg`)).subarray(0, 36);
    assert.equal(tete.subarray(0, 4).toString('latin1'), 'OggS', `${nom} : conteneur Ogg`);
    assert.ok(tete.includes(Buffer.from('OpusHead', 'latin1')),
      `${nom} : le conteneur doit porter de l’Opus — un MP3 boucle avec le silence de bourrage de son encodeur`);
  }
});

test('sons — aucun fichier orphelin dans src/sons/', () => {
  const oggs = readdirSync(dossier).filter((n) => n.endsWith('.ogg')).sort();
  assert.deepEqual(oggs, NOMS.map((n) => `${n}.ogg`).sort(),
    'un .ogg non déclaré ne serait ni encodé, ni documenté, ni joué');
});

/* ═════════════════════ 2. LA LICENCE ═════════════════════════════════════ */

test('★ sons — chacun dit sa source, son auteur et sa licence', () => {
  const texte = readFileSync(resolve(dossier, 'CC0-sons.txt'), 'utf8');
  for (const nom of NOMS) {
    assert.ok(texte.includes(`${nom}.ogg`), `« ${nom} » n’est pas documenté`);
  }
  // La licence est nommée, et son texte officiel est joignable : « CC0 ou
  // CC-BY, jamais gratuit mais tous droits réservés ».
  assert.match(texte, /CC0 1\.0/);
  assert.match(texte, /https:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\//);
  // Quatre provenances distinctes, une par son : un lien qui servirait deux
  // fois serait le signe qu'une attribution a été recopiée sans être vérifiée.
  const sources = [...texte.matchAll(/^ {3}Source {4}: (\S+)$/gm)].map((m) => m[1]);
  assert.equal(sources.length, 4, 'une ligne « Source » par son');
  assert.equal(new Set(sources).size, 4, 'quatre provenances distinctes');
});

test('sons — le pied de page les cite, comme il cite les polices', () => {
  const fr = readFileSync(resolve(racine, 'src/i18n/fr.js'), 'utf8');
  const en = readFileSync(resolve(racine, 'src/i18n/en.js'), 'utf8');
  for (const [langue, texte] of [['fr', fr], ['en', en]]) {
    assert.match(texte, /sons\/CC0-sons\.txt/, `${langue} : le pied doit pointer la licence`);
    assert.match(texte, /CC0 1\.0/, `${langue} : la licence doit être nommée`);
  }
  const html = readFileSync(resolve(racine, 'src/index.html'), 'utf8');
  assert.match(html, /data-i18n-html="pied\.sons"/, 'le pied doit porter la ligne, pas seulement le dictionnaire');
});

/* ═════════════════════ 3. LA POLITIQUE DU SILENCE ════════════════════════ */

test('★ sons — le son est COUPÉ par défaut : aucune clé, aucun bruit', () => {
  // La démonstration s'autojoue (CONTRACTS §3.4). Le défaut ne peut donc pas
  // être « actif » : un lien partagé lâcherait un drone à l'ouverture. Le
  // raisonnement complet est en tête de `src/app/sons.js` ; ici on gèle
  // l'implémentation : c'est l'ACCEPTATION qui se stocke, pas le refus.
  const reglages = readFileSync(resolve(racine, 'src/app/reglages.js'), 'utf8');
  assert.match(reglages, /sonActif = \(\) => magasin\.lire\(CLE_SON\) === 'actif'/,
    'l’absence de clé doit valoir « coupé »');
});

test('★ sons — le registre SOBRE ne charge aucun son', () => {
  // Le point du registre : la version sobre est partageable « plus crédible ».
  // Elle n'a pas de son, et elle n'a pas non plus à porter les éléments audio
  // qu'elle ne jouera jamais.
  const src = readFileSync(resolve(racine, 'src/app/sons.js'), 'utf8');
  assert.match(src, /const scenique = options\.registre !== 'sobre'/);
  assert.match(src, /if \(!scenique \|\| !formatLisible\(\)\) return joueurInerte\(\)/);
});

test('★ sons — un `play()` refusé est ABSORBÉ, jamais laissé remonter', () => {
  // Avant le premier geste, `play()` rend une promesse rejetée avec
  // NotAllowedError. C'est le comportement normal ; non capturée, elle
  // produirait une « Unhandled promise rejection » chez tout visiteur.
  const src = readFileSync(resolve(racine, 'src/app/sons.js'), 'utf8');
  assert.match(src, /NotAllowedError/, 'le refus doit être reconnu explicitement');
  // Chaque `play()` doit être suivi d'un `.catch` : on compte, plutôt que de
  // faire confiance à la relecture.
  const appels = (src.match(/\.play\(\)/g) || []).length;
  const rattrapes = (src.match(/\.catch\(/g) || []).length;
  assert.ok(rattrapes >= appels - 1,
    `${appels} appels à play() pour ${rattrapes} rattrapages : un refus non absorbé finit dans la console du visiteur`);
});

test('sons — l’interface ne ment pas : trois états, pas deux', () => {
  const transport = readFileSync(resolve(racine, 'src/app/transport.js'), 'utf8');
  for (const etat of ['sonCoupe', 'sonActif', 'sonAttente']) {
    assert.match(transport, new RegExp(`${etat}:`), `l’icône « ${etat} » doit exister`);
  }
  // « Actif, mais le navigateur n'a pas encore laissé passer » est un état à
  // part entière : il se calcule sur le déblocage RÉEL, pas sur la préférence.
  assert.match(transport, /const attente = actif && !sons\.debloque/);
});
