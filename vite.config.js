/** Le build — un outil de confort, pas un changement d'architecture.
 *
 *  Le site est écrit en modules ES natifs et se sert très bien lui-même : un
 *  serveur statique quelconque sur les sources, et c'est tout (`bun run dev`).
 *  Mais un module ES ouvert en `file://` est soumis à la politique CORS, et un
 *  fichier local a une origine « null » : le navigateur refuse le script. Le CSS
 *  passe, le logo s'affiche, et plus rien ne réagit — ça ressemble à un fichier
 *  périmé alors que tout est à jour.
 *
 *  D'où `bun run build` : Vite replie le site en UN script classique (`<script
 *  defer>`, pas `type="module"`), qui lui n'est pas soumis à CORS. Le résultat
 *  vit dans `dist/` et s'ouvre par double-clic.
 *
 *  Trois précautions font toute la différence :
 *    1. `base: './'` — aucun chemin absolu, sinon `/assets/…` pointerait sur la
 *       racine du disque ;
 *    2. `inlineDynamicImports` — un `import()` à l'exécution serait, lui aussi,
 *       un module ES, donc bloqué : tout doit tenir dans le fichier unique ;
 *    3. `protocoleFichier()` — la retouche finale du HTML (voir plus bas).
 *
 *  Rien de tout ça n'entre dans le bundle : aucune dépendance runtime n'est
 *  ajoutée au code source, qui reste lisible et exécutable tel quel.
 */

import { copyFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';

const racine = import.meta.dirname;

/**
 * La retouche qui rend `file://` viable.
 *
 * · `<script type="module" crossorigin src=…>` → `<script defer src=…>` : un
 *   script classique n'est pas soumis à CORS, et `defer` conserve l'exécution
 *   après analyse du document, comme un module.
 * · `<link rel="modulepreload">` devient une requête morte (et bruyante dans la
 *   console) une fois le module devenu script classique : on la retire.
 * · `crossorigin` sur les feuilles de style et les polices déclenche un contrôle
 *   CORS que `file://` ne peut pas satisfaire : on l'enlève partout.
 * · `<link rel="preload" as="font">` est RETIRÉ, pas seulement dépouillé de son
 *   `crossorigin`. Une police se précharge obligatoirement en mode CORS anonyme :
 *   sans `crossorigin` le préchargement n'est jamais réapparié à la requête du
 *   CSS, donc la police est téléchargée DEUX fois et arrive plus tard qu'avec
 *   aucun préchargement — Firefox le signale (« préchargée … n'a pas été
 *   utilisée »). Et le garder casserait en `file://`, dont l'origine est nulle.
 *   Le CSS charge les polices très bien tout seul.
 */
function protocoleFichier() {
  return {
    name: 'nhlg-protocole-fichier',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin src=/g, '<script defer src=')
        .replace(/<link rel="modulepreload"[^>]*>/g, '')
        .replace(/\s*<link rel="preload"[^>]*as="font"[^>]*>/g, '')
        .replace(/ crossorigin(?=[ >])/g, '');
    },
    generateBundle(_options, bundle) {
      for (const sortie of Object.values(bundle)) {
        if (sortie.type !== 'chunk') continue;
        // `import.meta` est une SYNTAXE de module : dans un script classique, le
        // navigateur rejette le fichier entier avant d'en exécuter la première
        // ligne — d'où une page muette, sans la moindre erreur d'exécution pour
        // la trahir. Vite en sème dans son assistant de préchargement, qui ne
        // sert plus à rien une fois tout replié dans un fichier unique (sa liste
        // de dépendances y vaut `void 0`). `document.baseURI` dit la même chose
        // — l'URL du document — dans une langue que le script classique parle.
        //
        // ★ MAIS CE SCRIPT N'EST PLUS TOUJOURS EXÉCUTÉ PAR UNE PAGE.
        //
        //   Depuis que la recherche peut passer dans un travailleur, le fichier
        //   unique est aussi chargé par `importScripts` depuis un Worker (voir
        //   `src/app/travailleur.js`, qui porte le relevé `file://`). Là, il n'y
        //   a pas de `document` du tout, et un `document.baseURI` nu au premier
        //   niveau jette une `ReferenceError` — que Chromium rapporte sous le
        //   nom trompeur de « NetworkError … failed to load ».
        //
        //   ⚠️ Ce n'est pas hypothétique : c'est exactement ce qui est arrivé,
        //   deux fois, et il a fallu bissecter le fichier construit pour le
        //   voir. La substitution répond donc à la vraie question — « quelle est
        //   l'URL de ce qui s'exécute ? » — des deux côtés : le document quand
        //   il y en a un, l'adresse du script courant sinon. C'est aussi ce que
        //   `import.meta.url` aurait valu dans un module de travailleur.
        sortie.code = sortie.code.replace(
          /\bimport\.meta\.url\b/g,
          '(typeof document<"u"?document.baseURI:self.location.href)',
        );
        const reste = sortie.code.match(/\bimport\.meta\b|(?:^|[;}])\s*(?:import|export)[\s{*]/);
        if (reste) {
          this.error(`${sortie.fileName} garde de la syntaxe de module (« ${reste[0].trim()} ») : `
            + 'il ne se chargera pas en file://.');
        }
      }
    },
  };
}

/**
 * Les licences, recopiées telles quelles.
 *
 * Vite renomme les `.woff2` avec une empreinte — très bien, ce sont des octets.
 * Mais le pied de page pointe `fonts/OFL-Jost.txt` par un `<a href>`, que Vite
 * ne réécrit pas (et ne doit pas réécrire : c'est un lien, pas une ressource).
 * Les licences sont donc recopiées à leur place d'origine. Elles ne sont pas
 * décoratives : ce site redistribue des œuvres de tiers.
 *
 * ★ Les SONS s'y ajoutent, pour la même raison exactement. Leurs `.ogg` ne sont
 * PAS copiés — ils ne sont jamais servis : ce sont des sources, comme
 * `src/gfx/jost.ttf`, dont `src/sons/data.js` est la dérivée empaquetée. Seul
 * `CC0-sons.txt` voyage, parce que le pied de page le pointe. CC0 n'exige
 * aucune attribution, ce qui rend cette copie facultative — et c'est
 * précisément pour ça qu'elle est faite.
 */
function licencesRedistribuees() {
  const copier = (dossier, garder) => (options) => {
    const source = resolve(racine, 'src', dossier);
    const cible = resolve(options.dir ?? resolve(racine, 'dist'), dossier);
    mkdirSync(cible, { recursive: true });
    for (const nom of readdirSync(source)) {
      if (garder(nom)) copyFileSync(resolve(source, nom), resolve(cible, nom));
    }
  };
  const polices = copier('fonts', (n) => n.startsWith('OFL-') && n.endsWith('.txt'));
  const sons = copier('sons', (n) => n.startsWith('CC0-') && n.endsWith('.txt'));
  return {
    name: 'nhlg-licences-redistribuees',
    apply: 'build',
    writeBundle(options) { polices(options); sons(options); },
  };
}


/**
 * `favicon.svg` vit à la RACINE du dépôt, pas dans les sources : c'est une
 * pièce d'identité du projet, au même titre que le README, et l'auteur le veut
 * là. Le HTML, lui, est dans `src/` et le désigne donc par `../favicon.svg`.
 *
 * Au build, Vite résout ce chemin et emporte le fichier dans `assets/` avec son
 * empreinte : rien à faire. En développement, Vite sert `src/` — `..` sort de
 * sa racine, et un navigateur ne remonte jamais au-dessus de `/` : il demande
 * `/favicon.svg`, à quoi le serveur répond l'index. On rattrape cette seule
 * requête, plutôt que de déplacer le fichier pour arranger l'outil.
 */
function faviconRacine() {
  return {
    name: 'nhlg-favicon-racine',
    apply: 'serve',
    configureServer(serveur) {
      serveur.middlewares.use('/favicon.svg', (_requete, reponse) => {
        reponse.setHeader('Content-Type', 'image/svg+xml');
        reponse.end(readFileSync(resolve(racine, 'favicon.svg')));
      });
    },
  };
}


/** L'icône Apple ne peut pas être un SVG : iOS exige un PNG. On la produit au
 *  build à partir de `favicon.svg`, pour qu'il n'existe qu'UNE source de vérité
 *  du dessin — un PNG versionné finirait par diverger du SVG sans que rien ne
 *  le dise. `rsvg-convert` est fourni par l'image de CI (1000i100/docker-ci-cd-publish).
 *  S'il manque, on ne laisse pas un lien mort dans le HTML : on retire la
 *  référence et on prévient bruyamment. */
function iconeApple() {
  let produite = false;
  return {
    name: 'nhlg-icone-apple',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return produite ? html : html.replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '');
      },
    },
    buildStart() {
      try {
        execFileSync('rsvg-convert', ['--version'], { stdio: 'ignore' });
        produite = true;
      } catch {
        produite = false;
        this.warn(
          "rsvg-convert est introuvable : `apple-touch-icon.png` ne sera pas produite "
          + "et sa balise est retirée du HTML plutôt que de pointer dans le vide. "
          + "Installez librsvg (paquet Alpine « rsvg-convert ») pour la rétablir.",
        );
      }
    },
    writeBundle(options) {
      if (!produite) return;
      const dossier = options.dir ?? resolve(racine, 'dist');
      execFileSync('rsvg-convert', [
        '-w', '180', '-h', '180',
        '-o', resolve(dossier, 'apple-touch-icon.png'),
        resolve(racine, 'favicon.svg'),
      ]);
    },
  };
}

export default defineConfig({
  // Les sources vivent dans `src/` : `index.html` y est, et c'est de là que
  // partent tous les chemins relatifs (`styles/`, `fonts/`, `app/main.js`).
  // `favicon.svg`, lui, reste à la racine du dépôt — c'est un fichier
  // d'identité, pas une source ; le HTML le désigne par `../favicon.svg`.
  root: resolve(racine, 'src'),
  // Tous les chemins produits sont relatifs au document : indispensable en
  // `file://`, sans conséquence en HTTP.
  base: './',
  // Le site n'a pas de dossier `public/` : tout ce qui est servi est référencé.
  publicDir: false,
  build: {
    // Un `outDir` relatif se lirait depuis `root`, donc `src/dist/`. On le
    // pose en absolu : le résultat va dans `dist/` à la racine du dépôt.
    // `emptyOutDir` doit alors être explicite — Vite refuse d'effacer un
    // dossier situé hors de sa racine sans un ordre écrit.
    outDir: resolve(racine, 'dist'),
    emptyOutDir: true,
    target: 'es2022',
    // ★ Les SONS aussi sont inlinés, et pour la même raison que les polices —
    // même seuil, même arbitrage. Les quatre pèsent 51 107 octets d'Opus, soit
    // ~68 100 une fois encodés : le même ordre de grandeur que les 67 712
    // octets de woff2 des quatre polices. Un son EST plus lourd qu'une police
    // — c'est vrai en général —, mais pas celui-ci : mono, 24 kHz, Opus à 24
    // ou 32 kb/s, et douze secondes en tout (voir `src/sons/CC0-sons.txt`).
    // Le budget de CONTRACTS §7.6, ≤ 260 Ko, reste tenu à moins de la moitié.
    //
    // Ce qui décide n'est d'ailleurs pas le poids mais la PROMESSE du pied de
    // page : « aucun appel réseau après le chargement ». Un `.ogg` servi à
    // part serait une requête de plus — et, en `file://`, une requête qu'on ne
    // peut pas garantir. Inliné, le son est là ou n'est pas là, comme le reste.
    //
    // ★ Les polices sont INLINÉES en base64 dans le CSS. C'est la réponse la
    // plus sûre pour un `dist/` destiné à `file://` : plus de requête séparée,
    // donc plus de question CORS ni de préchargement à réapparier, et surtout
    // la police est disponible EN MÊME TEMPS que la feuille de style — aucune
    // fenêtre pendant laquelle le texte serait mesuré sur une police de repli.
    // Prix : +33 % sur les octets encodés (65 Ko de woff2 → ~87 Ko de base64),
    // et le CSS cesse d'être mis en cache indépendamment des polices. Pour un
    // fichier qu'on ouvre au double-clic, l'échange est bon.
    assetsInlineLimit: 96 * 1024,
    // Sans ça, Vite enveloppe chaque `import()` dans son assistant de préchargement,
    // lequel lit `import.meta.url` — illégal dans un script classique, et le
    // navigateur refuse le fichier entier avant même de l'exécuter.
    modulePreload: false,
    // Les sources sont commentées avec soin ; la carte de source rend le bundle
    // aussi lisible qu'elles au débogueur.
    sourcemap: true,
    rollupOptions: {
      input: resolve(racine, 'src', 'index.html'),
      output: {
        // Un seul fichier de script : le découpage produirait des `import()` à
        // l'exécution, c'est-à-dire des modules ES, c'est-à-dire du CORS,
        // c'est-à-dire rien du tout en `file://`.
        //
        // (Le format reste `es`. `iife` semblerait plus honnête pour un script
        // classique, mais Vite bascule alors la feuille de style à l'intérieur
        // du JavaScript : le CSS cesserait d'être bloquant, la page clignoterait
        // avant de se peindre, et une page sans JavaScript perdrait sa mise en
        // forme. Le format `es` produit ici un fichier sans `import`, sans
        // `export` et sans `import.meta` : un script classique valide.)
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [protocoleFichier(), licencesRedistribuees(), faviconRacine(), iconeApple()],
});
