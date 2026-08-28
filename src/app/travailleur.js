/** Le lanceur de travailleur — et son repli, qui n'est pas un pis-aller.
 *
 *  ═══════════════ CE QU'UN `file://` AUTORISE VRAIMENT, MESURÉ ═══════════════
 *
 *  Le dépôt a longtemps tenu pour acquis qu'un Worker était hors de portée
 *  d'une page ouverte au double-clic. C'est faux, et voici le relevé qui l'a
 *  établi — Chromium 151 et Firefox 154, page `file://`, aucun drapeau de
 *  ligne de commande (surtout pas `--allow-file-access-from-files`, qu'un
 *  visiteur n'aura jamais) :
 *
 *  | ce qu'on tente                              | Chromium | Firefox |
 *  |---------------------------------------------|----------|---------|
 *  | `location.origin`                           | file://  | null    |
 *  | `new Worker('travailleur.js')`              | REFUSÉ   | REFUSÉ  |
 *  | `new Worker(blob)` classique                | OK       | OK      |
 *  | `new Worker(blob, {type:'module'})`         | REFUSÉ   | OK      |
 *  | `new Worker('data:text/javascript,…')`      | OK       | OK      |
 *  | `importScripts('file://…')` depuis le blob  | OK       | OK      |
 *  | `import('file://…')` depuis un blob module  | REFUSÉ   | REFUSÉ  |
 *  | `fetch('file://…')`                         | REFUSÉ   | REFUSÉ  |
 *
 *  Chromium sur le fichier séparé est explicite : « Script at 'file://…'
 *  cannot be accessed from origin "null" ». C'est le CHARGEMENT qui est
 *  interdit, pas le travailleur.
 *
 *  Trois conséquences, et elles dictent tout ce fichier :
 *
 *   1. le travailleur doit naître d'un **blob classique**. C'est la seule
 *      forme que les deux navigateurs acceptent en `file://` ;
 *   2. son corps ne peut pas être un module ES : `importScripts` charge des
 *      scripts classiques, et `import()` est refusé. Il lui faut donc du code
 *      déjà replié en script classique — c'est exactement ce que `vite.config.js`
 *      produit et vérifie (« il ne se chargera pas en file:// ») ;
 *   3. ce script-là, on l'a déjà sous la main : **c'est celui que la page vient
 *      d'exécuter**. Le travailleur ne charge pas une copie du moteur, il
 *      recharge le fichier unique. Une copie inlinée aurait coûté 227 Ko de plus
 *      (mesuré : le moteur de recherche empaqueté seul, minifié, 77 Ko gzippés),
 *      soit +40 % sur un site qui en pèse 186 — pour une jauge. Non.
 *
 *  ⚠️ Et c'est ce qui impose la règle du § suivant.
 *
 *  ══════════ POURQUOI `src/app/main.js` COMMENCE PAR SE DEMANDER QUI IL EST ═══
 *
 *  Chargé par `importScripts`, le fichier unique exécute TOUT son code de
 *  premier niveau, y compris celui de la page. Mesuré en `file://` : sans
 *  garde, le travailleur meurt sur `capturerModele(document)` — et Chromium
 *  rapporte cette mort sous le nom trompeur de « NetworkError … failed to
 *  load », strictement le même message qu'un fichier introuvable. (Vérifié en
 *  isolant les cas : une erreur d'exécution, une erreur de syntaxe et un
 *  fichier absent rendent le même message ; seule la bissection du fichier dit
 *  lequel des trois.)
 *
 *  D'où la règle, qui vaut pour tout le dépôt : **aucun module ne doit toucher
 *  au DOM au moment de son évaluation.** Le relevé ci-dessus l'a vérifiée sur
 *  l'état actuel — le seul code de premier niveau qui touchait `document`
 *  était l'amorçage lui-même, et il est désormais gardé. Si quelqu'un l'enfreint
 *  demain, le travailleur ne naîtra plus et le repli en tranches prendra la
 *  relève sans que rien ne casse : c'est une dégradation, pas une panne.
 *
 *  ═══════════════════════ ET QUAND LES SOURCES SONT SERVIES ══════════════════
 *
 *  En `bun run dev`, ou sur un hébergement statique des sources, il n'y a pas
 *  de fichier unique : la page est un module ES. Le travailleur est alors créé
 *  directement sur `src/recherche/travailleur.js`, en `{type:'module'}` — la
 *  forme la plus simple, et elle marche puisqu'on est en http(s).
 *
 *  Le discriminant est `document.currentScript` : il désigne le script en cours
 *  d'exécution dans un script CLASSIQUE, et vaut toujours `null` dans un module
 *  ES. Il dit donc d'un coup dans quel monde on est ET, si c'est le fichier
 *  unique, quelle est son adresse. */

/**
 * ★ Capturé À L'ÉVALUATION du module, et pas une ligne plus tard.
 *
 * `document.currentScript` ne vaut quelque chose que pendant l'exécution
 * synchrone du script. Le lire dans une fonction appelée sur un clic rendrait
 * toujours `null`, et le fichier unique serait pris pour des sources.
 */
const SCRIPT_UNIQUE = (typeof document !== 'undefined' && document.currentScript
  && document.currentScript.src) || null;

/**
 * L'adresse de ce module — utile seulement quand les sources sont servies.
 *
 * ⚠️ LA GARDE DIT UNE VÉRITÉ, elle ne rattrape pas un accident. Dans un
 * travailleur il n'existe pas de « mode sources » : le code y est arrivé par
 * `importScripts`, donc par le fichier unique, et chercher un module voisin à
 * côté de soi n'aurait aucun sens. `null` est la bonne réponse, et il court-
 * circuite proprement le test ci-dessous.
 *
 * (La sûreté, elle, est ailleurs : `vite.config.js` substitue à
 * `import.meta.url` une expression qui répond des deux côtés. Écrite nue, cette
 * ligne devenait `const … = document.baseURI` au PREMIER NIVEAU du fichier
 * unique — une `ReferenceError` dès qu'un travailleur le chargeait, que
 * Chromium rapportait sous le nom trompeur de « NetworkError … failed to
 * load ». Il a fallu bissecter le fichier construit pour la voir.)
 */
const URL_DE_CE_MODULE = typeof document === 'undefined' ? null : import.meta.url;

/** Combien de temps on laisse un travailleur prouver qu'il est né vivant.
 *  Au-delà, on ne l'attend plus : le repli local cherche tout aussi bien, et
 *  une page qui attend un fantôme est pire qu'une page qui calcule. */
const DELAI_NAISSANCE_MS = 3000;

/**
 * Fabrique un travailleur, ou rend `null` s'il n'y a pas de chemin praticable.
 *
 * @returns {{worker:Worker, forme:'fichier-unique'|'sources'}|null}
 */
export function ouvrirTravailleur() {
  if (typeof Worker !== 'function') return null;
  try {
    if (SCRIPT_UNIQUE) {
      // Le corps du travailleur tient en une ligne : recharger le script que la
      // page exécute. Un blob hérite de l'origine du document — c'est ce qui
      // le rend acceptable là où un fichier voisin ne l'est pas.
      const corps = `importScripts(${JSON.stringify(SCRIPT_UNIQUE)});`;
      const adresse = URL.createObjectURL(new Blob([corps], { type: 'text/javascript' }));
      const worker = new Worker(adresse);
      // L'URL de blob a fait son office dès la construction ; la révoquer tout
      // de suite évite de retenir le blob pour rien.
      URL.revokeObjectURL(adresse);
      return { worker, forme: 'fichier-unique' };
    }
    if (typeof URL_DE_CE_MODULE === 'string' && /\.js($|[?#])/.test(URL_DE_CE_MODULE)) {
      // ⚠️ L'adresse est composée par des VARIABLES, à dessein : écrite en
      //    toutes lettres, `new Worker(new URL('…', import.meta.url))` est un
      //    motif que Vite reconnaît et réécrit — il produirait un second
      //    fichier, ce que le `inlineDynamicImports` du build interdit
      //    justement. Ici, l'empaqueteur ne voit qu'un appel opaque, et cette
      //    branche ne s'exécute de toute façon jamais dans le fichier unique.
      const chemin = '../recherche/travailleur.js';
      const adresse = new URL(chemin, URL_DE_CE_MODULE).href;
      return { worker: new Worker(adresse, { type: 'module' }), forme: 'sources' };
    }
  } catch {
    // Un travailleur refusé n'est pas une panne : c'est le cas nominal de
    // beaucoup d'environnements. On se tait ici, le repli parle plus bas.
  }
  return null;
}

/**
 * ★ UN SEUL PROTOCOLE, DEUX TRANSPORTS.
 *
 * Le travailleur et le repli local parlent exactement la même langue — celle de
 * `recherche/index.js › creerCanal`. Un transport, ici, c'est deux fonctions :
 * poster un message, et recevoir les réponses. Le routage par génération, la
 * jauge, l'annulation : tout ce qui suit ne connaît que ça, et ne sait donc pas
 * lequel des deux chemins il emprunte. C'est la seule façon d'avoir un repli
 * aussi soigné que le chemin principal : c'est le même code.
 *
 * @param {{
 *   canalLocal?: () => Object|null,
 *   ouvrir?: () => ({worker:Worker, forme:string}|null),
 *   delaiNaissanceMs?: number,
 * }} [options]
 */
export function creerRechercheEnFond(options = {}) {
  const ouvrir = options.ouvrir || ouvrirTravailleur;
  const delai = options.delaiNaissanceMs ?? DELAI_NAISSANCE_MS;
  const canalLocal = options.canalLocal || (() => null);

  /** Les recherches en cours, par génération. */
  const enCours = new Map();
  let generation = 0;
  let transport = null;
  let mode = 'attente';

  const distribuer = (message) => {
    if (!message || typeof message.generation !== 'number') return;
    const demande = enCours.get(message.generation);
    if (!demande) return;   // une génération périmée : on l'ignore, elle n'a plus de destinataire
    if (message.type === 'avancement') { demande.surAvancement(message); return; }
    enCours.delete(message.generation);
    if (message.type === 'resultat') demande.tenir(message);
    else demande.rompre(new Error(message.message || 'recherche impossible'));
  };

  /** Le transport local : le moteur du fil principal, en tranches.
   *  `canalLocal` reçoit le distributeur et le passe à `creerCanal` comme
   *  fonction de postage — c'est là, et nulle part ailleurs, que les messages
   *  du canal local rejoignent ceux du travailleur. */
  const transportLocal = () => {
    const canal = canalLocal(distribuer);
    if (!canal) return null;
    return { forme: 'tranches', envoyer: (m) => canal.traiterProgressif(m) };
  };

  /**
   * Le travailleur doit prouver qu'il est né vivant avant qu'on lui confie une
   * recherche. Un blob qui échoue à charger le script ne le dit qu'en
   * `onerror` — ou ne le dit pas du tout —, et une page qui aurait posté sa
   * demande dans le vide n'afficherait jamais rien.
   */
  const naissance = new Promise((tenir) => {
    let ne = null;
    try { ne = ouvrir(); } catch { ne = null; }
    if (!ne) { tenir(null); return; }
    const { worker, forme } = ne;
    let conclu = false;
    const conclure = (valeur) => { if (!conclu) { conclu = true; tenir(valeur); } };
    const minuterie = setTimeout(() => { conclure(null); worker.terminate(); }, delai);
    worker.onerror = () => {
      clearTimeout(minuterie);
      // ★ DEUX MORTS POSSIBLES, ET LA SECONDE EST LA PLUS TRAÎTRE. Avant le
      //   choix, `onerror` veut dire « ce travailleur ne naîtra pas » : on
      //   conclut sur `null` et le repli local prend la suite. APRÈS, il veut
      //   dire « il vient de mourir en chemin », et il faut réveiller les
      //   recherches qu'il emporte avec lui : sans ça, la page d'attente reste
      //   à l'écran pour toujours, jauge figée, sans le moindre message.
      //   Rompues, elles remontent jusqu'à `pont.resoudreEnFond`, qui refait le
      //   calcul sur place plutôt que de laisser le visiteur devant rien.
      if (!conclu) { conclure(null); return; }
      for (const [g, demande] of enCours) {
        enCours.delete(g);
        demande.rompre(new Error('le travailleur de recherche s’est arrêté'));
      }
    };
    worker.onmessage = (evenement) => {
      const message = evenement && evenement.data;
      if (message && message.type === 'pret') {
        clearTimeout(minuterie);
        conclure({ forme, envoyer: (m) => worker.postMessage(m) });
        return;
      }
      if (message && message.type === 'erreur' && message.generation === undefined) {
        // Le travailleur a démarré mais n'a pas pu charger le catalogue : il ne
        // servira à rien, et le repli local a peut-être plus de chance.
        clearTimeout(minuterie);
        conclure(null);
        worker.terminate();
        return;
      }
      distribuer(message);
    };
    worker.postMessage({ type: 'ping' });
  });

  const pret = naissance.then((viaWorker) => {
    transport = viaWorker || transportLocal();
    mode = transport ? transport.forme : 'aucun';
    return transport;
  });

  return {
    /** `'fichier-unique'`, `'sources'`, `'tranches'` ou `'aucun'`. */
    mode: () => mode,
    /** La promesse du choix — les tests et le diagnostic en ont besoin. */
    pret: () => pret,
    /**
     * Lance une recherche et rend son résultat sérialisé.
     * @param {string} saisie
     * @param {?string} cible   la cible en CLAIR (`'111'`), jamais un objet
     * @param {{surAvancement?:(a:Object)=>void}} [reglages]
     * @returns {Promise<Object|null>}  `null` si aucun moteur n'est disponible
     */
    async chercher(saisie, cible, reglages = {}) {
      const voie = await pret;
      if (!voie) return null;
      const mienne = ++generation;
      // Les recherches précédentes n'intéressent plus personne : on les oublie
      // ici, et le canal les abandonne de son côté (`creerCanal`, génération).
      for (const [g, d] of enCours) if (g !== mienne) { enCours.delete(g); d.tenir(null); }
      return new Promise((tenir, rompre) => {
        enCours.set(mienne, {
          tenir, rompre,
          surAvancement: reglages.surAvancement || (() => {}),
        });
        voie.envoyer({ type: 'resoudre', generation: mienne, saisie, cible: cible || undefined });
      });
    },
  };
}
