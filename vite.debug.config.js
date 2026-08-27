/** Le second passage de build — `debug.html`.
 *
 *  ★ POURQUOI UN SECOND FICHIER PLUTÔT QU'UNE SECONDE ENTRÉE.
 *
 *  La configuration principale pose `inlineDynamicImports: true`, et ce n'est
 *  pas un réglage de confort : c'est ce qui garantit que le site s'ouvre en
 *  `file://` (voir l'en-tête de `vite.config.js`). Or Rollup refuse cette
 *  option dès qu'il y a PLUSIEURS entrées — il ne saurait pas dans lequel des
 *  bundles replier le code partagé.
 *
 *  Deux entrées dans une seule configuration obligeraient donc à y renoncer, et
 *  le double-clic sur `dist/index.html` cesserait de fonctionner. On préfère
 *  construire deux fois : chaque page reste un fichier unique et autonome, au
 *  prix d'un peu de code dupliqué dans les deux bundles — ce qui n'a aucune
 *  importance pour une page qu'on n'atteint qu'en tapant son adresse.
 *
 *  ⚠ `emptyOutDir: false` : ce passage vient APRÈS le principal et ne doit
 *  surtout pas effacer ce qu'il vient de produire.
 */

import { resolve } from 'node:path';
import { defineConfig } from 'vite';

import base from './vite.config.js';

const racine = import.meta.dirname;

export default defineConfig({
  ...base,
  // Les greffons du build principal recopient les licences, le favicon et
  // l'icône Apple. Les rejouer ici referait le même travail pour rien, et le
  // greffon de retouche `file://` est le seul dont cette page ait besoin.
  plugins: (base.plugins || []).filter((p) => p && p.name === 'nhlg-protocole-fichier'),
  build: {
    ...base.build,
    emptyOutDir: false,
    rollupOptions: {
      ...base.build.rollupOptions,
      input: resolve(racine, 'src', 'debug.html'),
    },
  },
});
