/** Le cinquième passage de build — `glyphes2.html`, la jumelle Jost.
 *
 *  Même raison que `vite.glyphes.config.js`, `vite.debug.config.js` et
 *  `vite.arbitrage.config.js` : `inlineDynamicImports` interdit plusieurs
 *  entrées dans une même configuration, et c'est lui qui garantit qu'une page
 *  s'ouvre en `file://`. On construit donc une fois de plus.
 *
 *  ⚠️ **ET `emptyOutDir` RESTE À `false`** — ce passage vient après les quatre
 *    autres et ne doit surtout pas balayer ce qu'ils ont écrit. C'est la même
 *    précaution que sur `glyphes.html`, et l'ordre dans `package.json › build`
 *    en fait partie.
 */

import { resolve } from 'node:path';
import { defineConfig } from 'vite';

import base from './vite.config.js';

const racine = import.meta.dirname;

export default defineConfig({
  ...base,
  plugins: (base.plugins || []).filter((p) => p && p.name === 'nhlg-protocole-fichier'),
  build: {
    ...base.build,
    emptyOutDir: false,
    rollupOptions: {
      ...base.build.rollupOptions,
      input: resolve(racine, 'src', 'glyphes2.html'),
    },
  },
});
