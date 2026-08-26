/**
 * LE FEU — la pile d'ombres d'atnyman, transposée en `drop-shadow()`.
 *
 * Ce module ne contient **aucun DOM et aucune animation** : rien que des
 * fonctions pures qui rendent des chaînes de filtres et des nombres. `dom.js`
 * les met en SVG, `pages.css` les met en mouvement, `reveal.js` décide quand
 * elles paraissent. La séparation n'est pas décorative — c'est ce qui rend le
 * feu testable en `node --test`, sans navigateur (CONTRACTS §0.1).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ## D'OÙ VIENT CE DESSIN, ET LES DEUX TENTATIVES QU'IL REMPLACE
 *
 * Les six pages de référence de l'auteur sont dans `.planning/inspirations/feu/`
 * — sources rapatriées, analysées une par une, avec le motif du refus de
 * chacune. Ce fichier applique la **n° 1**, `01-atnyman`, sur sa demande
 * expresse : « Peux-tu tenter ma version préférée ou me dire pourquoi tu
 * l'écartes ? Sinon la première, en text-shadow, surtout si tu peux l'adapter
 * pour pouvoir l'utiliser aussi bien pour du texte que pour des formes SVG. »
 *
 * **Deux tentatives ont échoué avant, et leurs cadavres disent quoi ne pas
 * refaire :**
 *
 *  1. **un foyer DERRIÈRE chaque chiffre** — une silhouette de flamme, des
 *     langues, une lueur. Refusé : « je ne veux pas un feu derrière chaque
 *     chiffre, mais que les chiffres eux-mêmes s'enflamment ». Une flamme et un
 *     glyphe n'ont pas la même forme ; aucun raffinement du dessin n'y change
 *     rien ;
 *  2. **des COPIES NETTES du glyphe**, décalées et refroidies — la bonne idée,
 *     la mauvaise exécution. Refusé : « ça ressemble plus à des **feuilles qui
 *     s'échappent des 6** qu'à des flammes ».
 *
 * ★ **Et le diagnostic de cet échec-là est la clé de celui-ci : il manquait le
 * FLOU.** Une copie de glyphe à bord franc se lit comme un objet — une feuille,
 * un pétale, une découpe. Le feu n'a pas de bord. Chez atnyman, chacune des
 * sept ombres porte un flou de 20 à 80 px, et c'est **ce flou** qui transforme
 * une pile de copies en halo de chaleur. On avait pris sa rampe et sa
 * géométrie ; on avait laissé la seule chose qui faisait le feu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ## LA TRANSPOSITION : `text-shadow` → `drop-shadow()`
 *
 * C'est très exactement l'adaptation que l'auteur demande. `text-shadow` ne
 * s'applique qu'au texte ; **`filter: drop-shadow()` s'applique à n'importe
 * quel élément SVG** — un `<text>` comme un `<path>`. La même pile de sept
 * décalages colorés devient une chaîne de sept `drop-shadow()`, et elle vaut
 * alors pour **les chiffres ET pour les cornes**, sans une ligne de plus.
 *
 * ★ **Le corps qui brûle est peint COULEUR DE NUIT, et c'est le tour de main
 * d'atnyman.** Chez lui, la lettre est noire (`color: #000`) sur un fond noir
 * (`#111`) : on ne voit qu'elle par ses ombres. On fait pareil — la copie du
 * glyphe est remplie de `--scene-nuit`, donc invisible sur la nuit du verdict,
 * et seuls ses halos se voient. Le vrai chiffre, lui, est peint PAR-DESSUS,
 * dans sa couche à lui, en rubrique.
 *
 * ★ **Conséquence heureuse et non recherchée : la lisibilité du verdict est
 * rendue par CONSTRUCTION.** `drop-shadow` peint l'ombre DERRIÈRE l'élément qui
 * la porte ; la copie couleur de nuit couvre donc exactement l'empreinte du
 * glyphe, et le vrai chiffre repose sur du fond pur — ses **7,4:1**
 * (`tokens.css`), partout, sans dérogation. Les deux tentatives précédentes
 * devaient toutes deux acheter leur lisibilité par un compromis ; celle-ci n'en
 * paie aucun.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ## LE COÛT — et la mesure qui a changé le montage
 *
 * Une chaîne de `drop-shadow()` est une chaîne de passes de flou, et le décor
 * du verdict grossit **×8**. C'est exactement le coût que CONTRACTS §3.1
 * redoute. Il a donc été mesuré (`src/gfx/_feu-perf.html`), et la mesure a
 * livré un résultat net, qui commande tout le montage :
 *
 * | montage | coût |
 * |---|---|
 * | filtre **animé** (le montage d'atnyman, transposé tel quel) | **> 100 %** d'un cœur |
 * | filtre **figé** | **0 %** |
 *
 * ★ **Un filtre statique est tramé une fois et mis en cache ; un filtre animé
 * est refait à chaque image.** Toute la dépense est là — pas dans le nombre de
 * couches, qui ne bouge presque rien.
 *
 * ★ **D'où le montage retenu : DEUX corps, aucun filtre animé.** Le premier
 * porte l'état A et ne bouge jamais ; le second porte l'état B et **son opacité**
 * va et vient. `opacity` est un canal de COMPOSITION : le moteur mêle deux
 * tramages déjà en cache, ce qui est gratuit. On obtient la respiration
 * d'atnyman — l'état B est le plus chaud et le plus haut, donc il se lit comme
 * une reprise du feu — sans payer une seule passe de flou par image.
 *
 * ★ Et le corps A garde son opacité à **un**, jamais animée. Ce n'est pas un
 * détail : c'est lui qui SCELLE l'empreinte du glyphe en couleur de nuit. Deux
 * corps qui se fondraient l'un dans l'autre laisseraient, à mi-fondu, un trou
 * d'opacité par lequel les halos remonteraient sous le chiffre — et le
 * contraste du verdict avec.
 *
 * Trois interdits, tenus :
 *
 *  · **aucun tirage au sort** — `Math.random` et `Date.now` sont absents. La
 *    variété d'un foyer à l'autre vient de `graine()`, une empreinte FNV-1a de
 *    l'identifiant du jeton (CONTRACTS §4.4) ;
 *  · **jamais d'opacité animée sur un élément portant une transformation** — ici
 *    le seul canal animé est `filter`, et il est seul sur son élément
 *    (`tests/compositeur.test.js`, défaut de composition de Firefox) ;
 *  · **`prefers-reduced-motion` donne un feu FIXE**, pas un feu absent.
 */

/**
 * ★ LA RAMPE THERMIQUE — cinq paliers, du plus chaud au plus froid.
 *
 * Les noms sont ceux des jetons de thème (`tokens.css`, `--scene-*`) : la
 * palette est RÉSOLUE à la compilation par `player.js` et voyage dans
 * `ctx.palette`, comme toutes les autres couleurs de la scène. Ces clés-ci ne
 * dépendent pas du thème — au verdict la nuit est tombée, et une fois tombée le
 * thème ne gouverne plus la scène (CONTRACTS §3.1).
 *
 * atnyman en emploie sept, hors de toute charte
 * (`#fefcc9 · #feec85 · #ffae34 · #ec760c · #cd4606 · #973716 · #451b0e`). On
 * les quantifie sur cinq jetons plutôt que d'en inventer sept : la lecture est
 * la même — un dégradé de température qui monte — et la palette reste une
 * palette, c'est-à-dire quelque chose qu'on peut changer en un endroit.
 */
export const RAMPE = Object.freeze(['coeur', 'flamme', 'brasier', 'braise', 'fumee']);

/**
 * ★ LES COUCHES — la pile de sept ombres d'atnyman, ramenée à CINQ.
 *
 * Chaque couche est une ombre portée : un décalage, un flou, une teinte. Les
 * longueurs sont en **corps de glyphe**, jamais en pixels : le feu doit valoir
 * pour un chiffre de la ligne comme pour le même chiffre grossi huit fois au
 * verdict, et une constante en pixels ne le suivrait pas.
 *
 * ★ **Cinq et non sept, et c'est une décision MESURÉE.** Sept passes de flou à
 * l'échelle huit du verdict coûtent trop cher — le banc `src/gfx/_feu-perf.html`
 * donne le chiffre du jour. Mais on ne se contente pas de couper les deux
 * dernières : **on redistribue**. La portée verticale de la pile reste celle
 * d'atnyman — le dernier palier monte à 0,60 corps de glyphe, là où sa fumée
 * monte à 0,56 —, simplement répartie sur cinq marches au lieu de sept.
 *
 * ★ **Sans cette redistribution, le feu ne MONTE pas.** Cinq couches à ses
 * décalages d'origine s'arrêtent à mi-course : le flou étant isotrope, on
 * obtient un halo rond autour du chiffre, joli et faux. C'est le décalage
 * vertical du dernier palier, et lui seul, qui fait la différence entre une
 * lueur et un panache. Constaté au banc, corrigé au banc.
 *
 * ★ **Et surtout : LA CHALEUR MONTE DANS LA PILE.** C'est le vrai trait de
 * génie du pen, et il ne saute pas aux yeux à la lecture. Entre l'état A et
 * l'état B, atnyman ne bouge pas seulement les décalages : il **décale les
 * couleurs d'un cran vers le haut** — la couche qui était orange devient jaune,
 * celle qui était rouge devient orange. Ce n'est pas une pile qui respire,
 * c'est de la matière qui monte à travers elle. C'est ce qui distingue son feu
 * des cinq autres, et c'est reproduit tel quel (`teinteB`).
 *
 * `dx`/`dy` : décalage, `dy` négatif = vers le haut (la chaleur part en haut).
 * `flou`    : rayon du flou.
 * `teinteA` / `teinteB` : la couleur aux deux extrémités de la respiration.
 */
export const COUCHES = Object.freeze([
  Object.freeze({ dxA: 0, dyA: -0.02, flouA: 0.09, teinteA: 'coeur', dxB: 0, dyB: -0.02, flouB: 0.10, teinteB: 'coeur' }),
  Object.freeze({ dxA: 0.06, dyA: -0.12, flouA: 0.16, teinteA: 'flamme', dxB: 0.06, dyB: -0.13, flouB: 0.16, teinteB: 'coeur' }),
  Object.freeze({ dxA: -0.12, dyA: -0.26, flouA: 0.24, teinteA: 'brasier', dxB: -0.13, dyB: -0.28, flouB: 0.24, teinteB: 'flamme' }),
  Object.freeze({ dxA: 0.12, dyA: -0.42, flouA: 0.32, teinteA: 'braise', dxB: 0.14, dyB: -0.45, flouB: 0.38, teinteB: 'brasier' }),
  Object.freeze({ dxA: -0.12, dyA: -0.60, flouA: 0.42, teinteA: 'fumee', dxB: -0.14, dyB: -0.56, flouB: 0.36, teinteB: 'braise' }),
]);

/**
 * ★ LES DEUX PÉRIODES DE BASE, PREMIÈRES ENTRE ELLES.
 *
 * atnyman en emploie deux — 1 000 ms pour les lettres « fire », 650 ms pour les
 * lettres « burn » —, ce qui suffit déjà à désynchroniser son mot. On garde le
 * principe et on le durcit : deux **nombres premiers**, et chaque foyer tire
 * dans l'intervalle qu'ils bornent.
 *
 * ⚠ **Le piège, attrapé par un test et pas par l'œil.** Une première rédaction
 * employait des périodes « différentes » — 1 130, 1 490, 1 870 — toutes
 * multiples de dix, donc de ppcm 168 secondes : le feu se rejouait à
 * l'identique toutes les deux minutes quarante-huit. Des périodes premières
 * entre elles ne se retrouvent en phase qu'au bout de leur produit.
 * `tests/feu.test.js` l'exige désormais par un `pgcd`.
 */
export const PERIODES = Object.freeze({ min: 653, max: 1129 });

/**
 * ★ LA GERMINATION — de la graine à la flamme pleine.
 *
 * « Idéalement je voudrais qu'elles germent petit puis qu'elles grandissent
 * progressivement jusqu'à atteindre leur taille actuelle » (l'auteur). La
 * taille d'arrivée ne change donc PAS : ce qui change, c'est qu'on y arrive au
 * lieu d'y être posé.
 *
 * ★ Elle est obtenue par un `transform: scale()` sur l'enveloppe du foyer, et
 * jamais en animant le filtre. Un filtre animé coûte plus d'un cœur (mesuré,
 * `_feu-perf.html`) parce qu'il faut re-tramer les cinq flous à chaque image ;
 * une enveloppe qui grandit ne fait que ré-échantillonner une texture déjà
 * tramée, ce que le compositeur sait faire sans le processeur.
 *
 * `duree` : la pousse d'un foyer, à ±20 % près.
 * `echelonnement` : l'étalement des départs. Il a deux raisons, l'une visible
 *   et l'autre non : un feu qui prendrait d'un seul coup sur les six chiffres
 *   serait le retour du défaut « ils sont identiques », ET les six premiers
 *   tramages de filtre tomberaient sur la même image — c'est-à-dire un gel.
 */
export const GERMINATION = Object.freeze({
  duree: 1400,
  echelonnement: 900,
  /**
   * ★ L'ampleur de la GRAINE, en fraction de l'ampleur adulte.
   *
   * ⚠ C'est une ampleur, PAS une échelle — et la nuance est tout le correctif.
   *
   * La première rédaction faisait grandir le CORPS : un `transform: scale()`
   * de 0,18 à 1 sur l'enveloppe du foyer. Le résultat était juste au sens
   * arithmétique et faux à l'écran — « la dernière version fait apparaître en
   * dessous des lettres leur clone enflammé miniature puis les fait grossir.
   * On n'est pas censé voir la plomberie interne ! » (l'auteur). Rétrécir le
   * corps rétrécit AUSSI la silhouette qui projette les flammes : on voyait
   * donc un petit chiffre en feu à côté du grand, c'est-à-dire l'échafaudage.
   *
   * Le corps reste désormais à sa taille, TOUJOURS, exactement superposé au
   * vrai chiffre. Ce qui germe, ce sont les FLAMMES : une seconde chaîne de
   * filtres, identique mais aux décalages et aux flous réduits, qui s'efface
   * pendant que la chaîne adulte paraît. Deux filtres statiques et un fondu
   * croisé d'opacité — le compositeur suffit, rien n'est re-tramé.
   */
  depart: 0.32,
});

/**
 * Empreinte FNV-1a 32 bits d'une chaîne, ramenée à `[0,1[`.
 *
 * ★ C'est le remède à « ils sont identiques ». Sans elle, les six 6 d'un verdict
 * brûlent à l'unisson — six copies de la même flamme, ce qui se voit
 * immédiatement et ruine l'illusion. Avec elle, chaque foyer a sa période, sa
 * phase et son amplitude, et ce sont **des fonctions de son identifiant** : le
 * même 6 brûle toujours pareil, deux 6 différents ne brûlent jamais pareil, et
 * rien n'est tiré au sort. Même outil, même raison que `cleDeTable`
 * (`assets.js`).
 */
export function graine(id) {
  let h = 0x811c9dc5;
  const s = String(id || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // ★ L'AVALANCHE FINALE, et pourquoi elle n'est pas facultative.
  //
  // FNV-1a mélange mal ses bits de POIDS FORT sur le dernier octet consommé :
  // son dernier tour est `h ^= octet ; h *= premier`, et l'influence de cet
  // octet ne remonte vers le haut du mot que par les retenues. Sur une famille
  // d'identifiants qui ne diffèrent que par leur fin — `d0`, `d1`, `d2`… —, les
  // vingt-quatre bits de tête restent donc presque les mêmes.
  //
  // Mesuré : sans ce mélange, les quinze foyers d'une moisson tiraient cinq
  // ampleurs distinctes au lieu de quinze, toutes entre 0,94 et 1,04. Autrement
  // dit la variété que l'auteur réclamait — « ils sont identiques » — n'avait
  // lieu qu'en apparence, et aucune image ne l'aurait montré. C'est un test qui
  // l'a attrapé (`tests/feu.test.js`).
  //
  // Le finaliseur est celui de la famille `lowbias32` : deux décalages-ou-exclusifs
  // encadrant deux multiplications, qui étalent chaque bit d'entrée sur tout le mot.
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return (h >>> 8) / 0x01000000;
}

/** Une seconde empreinte, décorrélée de la première : `graine` d'une variante. */
const graine2 = (id, sel) => graine(`${sel} ${id}`);

/**
 * Décrit le feu d'un corps — un glyphe, ou une corne.
 *
 * Fonction PURE de `(fontSize, id, part)`. Elle rend les **deux chaînes de
 * filtres** entre lesquelles la respiration se joue, plus la cadence propre à
 * ce foyer. C'est elle que `dom.js` déroule et qu'un test gèle sans navigateur.
 *
 * ★ Les deux chaînes sont **statiques** : aucune n'est animée, et c'est ce qui
 * rend le feu gratuit (voir l'en-tête). Ce qui va et vient, c'est l'OPACITÉ du
 * corps qui porte la seconde.
 *
 * `part` distingue le feu du GLYPHE de celui de sa CORNE : deux corps du même
 * foyer, qui partagent le repère et l'échelle mais ne doivent pas brûler à
 * l'unisson.
 *
 * @param {{fontSize:number, id:string, part?:string, palette:object}} corps
 * @returns {{a:string, b:string, periode:number, retard:number, ampleur:number}}
 */
export function feuDe({ fontSize, id, part = '', palette }) {
  const cle = part ? `${id}#${part}` : id;
  const g = graine(cle);

  // ★ L'AMPLEUR varie de ±20 % d'un foyer à l'autre : deux chiffres voisins
  //   n'ont donc pas la même hauteur de flamme, ce que « identiques »
  //   reprochait autant que la synchronie. Elle multiplie décalages ET flous —
  //   un petit feu est petit en entier, il n'est pas un grand feu écrasé.
  const ampleur = 0.8 + 0.4 * graine2(cle, 'ampleur');

  // La période est propre au foyer, dans l'intervalle borné par les deux
  // nombres premiers de `PERIODES`. Deux foyers ne battent donc jamais
  // ensemble, et aucun ne bat en mesure avec un autre.
  const periode = Math.round(PERIODES.min + (PERIODES.max - PERIODES.min) * g);

  // ★ Retard NÉGATIF : la respiration est déjà en cours à la première image. Le
  //   feu n'a donc pas de « départ » visible, même quand on arrive sur le
  //   verdict d'un seul coup de jauge.
  const retard = -Math.round(periode * graine2(cle, 'phase'));

  // ★ LA GERMINATION — « je voudrais qu'elles germent petit puis qu'elles
  //   grandissent progressivement jusqu'à atteindre leur taille actuelle »
  //   (l'auteur). Elle est propre au foyer, comme tout le reste : un feu qui
  //   partirait au même instant sur les six chiffres serait le retour exact du
  //   défaut « ils sont identiques ».
  //
  //   ★ ET ELLE SERT AUSSI LA MACHINE. Les six premières germinations sont
  //   échelonnées, donc les six tramages de filtre ne tombent pas sur la même
  //   image : au lieu d'un gel d'une seconde, le coût s'étale.
  const pousse = Math.round(GERMINATION.duree * (0.8 + 0.4 * graine2(cle, 'pousse')));
  const semis = Math.round(GERMINATION.echelonnement * graine2(cle, 'semis'));

  return {
    // La graine : la MÊME pile, aux mêmes couleurs, mais courte. Ce n'est pas
    // un autre feu, c'est le même qui n'a pas encore pris.
    graine: chaine(fontSize, ampleur * GERMINATION.depart, palette, 'A'),
    a: chaine(fontSize, ampleur, palette, 'A'),
    b: chaine(fontSize, ampleur, palette, 'B'),
    periode,
    retard,
    ampleur: arr(ampleur),
    pousse,
    semis,
  };
}

/**
 * Une chaîne de `drop-shadow()`, dans l'un des deux états de la respiration.
 *
 * ★ Les longueurs sortent en `px` parce que la syntaxe CSS l'exige, mais elles
 * sont dans le **repère local du nœud** : sur un élément SVG, un filtre opère
 * dans l'espace utilisateur, donc l'unité est celle du `viewBox` et le feu
 * grandit avec son chiffre au verdict, sans une ligne d'arithmétique.
 */
function chaine(fontSize, ampleur, palette, etat) {
  const u = (v) => arr(v * fontSize * ampleur);
  return COUCHES.map((c) => {
    const [dx, dy, flou, teinte] = etat === 'A'
      ? [c.dxA, c.dyA, c.flouA, c.teinteA]
      : [c.dxB, c.dyB, c.flouB, c.teinteB];
    return `drop-shadow(${u(dx)}px ${u(dy)}px ${u(flou)}px ${palette[teinte]})`;
  }).join(' ');
}

/* ═══════════════════ LE CONTRÔLE DE LISIBILITÉ, EN CLAIR ══════════════════ */

/**
 * ★ CE QUE LE FEU PEINT PAR-DESSUS LE CHIFFRE : **rien**, et c'est démontrable.
 *
 * `drop-shadow()` peint l'ombre **derrière** l'élément qui la porte. Le corps
 * qui brûle étant une copie du glyphe remplie de `--scene-nuit`, il couvre
 * exactement l'empreinte du vrai chiffre — lequel est peint par-dessus, dans sa
 * couche. Le fond immédiat de l'encre du verdict est donc la nuit, pure, et son
 * contraste est celui que `tokens.css` a mesuré une fois pour toutes.
 *
 * Cette fonction existe pour que ce raisonnement soit **vérifié et non
 * raconté** : elle rend la couleur réellement présente sous l'encre, et
 * `tests/feu.test.js` en exige les 4,5:1 de design §5.1. Le jour où quelqu'un
 * remplira le corps d'autre chose que la nuit — parce qu'il aura trouvé ça plus
 * joli —, le test rougira avant l'auteur.
 *
 * @param {{nuit:string}} palette
 * @param {string} remplissage la couleur dont `dom.js` remplit le corps
 * @returns {[number,number,number]} le RVB sous l'encre, 0–255
 */
export function fondSousLEncre(palette, remplissage) {
  return rvb(remplissage || palette.nuit);
}

/** Luminance relative WCAG 2.x d'un RVB 0–255. */
export function luminance([r, g, b]) {
  const c = (v) => {
    const u = v / 255;
    return u <= 0.03928 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

/** Rapport de contraste WCAG entre deux RVB. */
export function contraste(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** `#RRGGBB` → `[r,g,b]`. Les jetons de thème n'ont jamais d'autre forme. */
export function rvb(hex) {
  const h = String(hex).replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** Deux décimales : une longueur de filtre n'a aucun besoin de plus. */
function arr(v) {
  return Math.round(v * 100) / 100;
}
