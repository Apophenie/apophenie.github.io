/** Le quatrième passage de build — `glyphes.html`.
 *
 *  Même raison que `vite.debug.config.js` et `vite.arbitrage.config.js` :
 *  `inlineDynamicImports` interdit plusieurs entrées dans une même
 *  configuration, et c'est lui qui garantit qu'une page s'ouvre en `file://`.
 *  On construit donc une fois de plus.
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
      input: resolve(racine, 'src', 'glyphes.html'),
    },
  },
});
