/**
 * `reveal` — le verdict.
 *
 * C'est la chute de toute la démonstration : elle doit se voir. L'ordre des
 * gestes est le propos, et il dépend de ce qu'il y a à révéler — **un** 666,
 * ou plusieurs.
 *
 * ## 1. La scène se vide
 *
 * Tout ce qui traînait encore — les `-`, le `.fr`, ce qui n'a pas été retenu et
 * qu'un `dim` avait laissé en veilleuse — **s'efface**. Un filigrane n'est pas
 * neutre : il continue de compter dans la ligne, il pousse les chiffres du
 * verdict hors du centre, et il donne à lire un résultat qui traîne des restes.
 * Ce qui n'est pas le verdict quitte donc la scène avant que le verdict ne se
 * forme. Les jetons ne sont **pas** retirés du DOM (CONTRACTS §3.2 règle 7) :
 * ils sortent du flux de layout, et un `seek()` en arrière les ramène.
 *
 * ## 2. Les chiffres se regroupent, au centre
 *
 * Une fois seuls dans le flux, ils sont centrés **par le layout**, pas par un
 * placement à la main : leur largeur et leur espacement sont mis à l'échelle,
 * et `reflow` fait le reste. Le geste reste donc idempotent — un `reflow`
 * ultérieur ne les déplacerait pas d'un iota.
 *
 * ## 3. Ils grandissent jusqu'à prendre la scène
 *
 * L'agrandissement est **calculé**, jamais deviné : la hauteur de capitale et
 * la largeur totale sont ramenées à une fraction de la scène, en gardant de
 * l'air autour. Le facteur est le plus contraignant des deux.
 *
 * ★ Et le décor ACCROCHÉ aux chiffres compte dans cette hauteur. Les cornes du
 * 666 dépassent bien plus haut qu'une capitale ; les ignorer les enverrait hors
 * du cadre dès que le verdict grossit. Ce que l'on pose sur les chiffres leur
 * prend donc de la taille — ce qui est le bon arbitrage : un 666 un peu plus
 * petit se lit encore, un 666 dont les cornes sortent du cadre, non.
 *
 * ## Quand il y a PLUS qu'un 666
 *
 * Une moisson rend « 666 666 666 666 666 ». Quinze chiffres jetés d'un bloc au
 * milieu de la scène ne se lisent pas : ni comme un nombre (personne ne compte
 * quinze rangs), ni comme cinq fois 666 (rien ne le dit). Et les grossir tous
 * ensemble sur une ligne les rapetisse, puisque c'est la LARGEUR qui borne
 * l'agrandissement — cinq séries d'un seul tenant ne montent qu'à ×1,7 là où
 * une série monte à ×8,5.
 *
 * Le geste se déplie donc en trois temps, et **chaque temps dit une chose** :
 *
 *  1. **rassembler** — le reste s'efface, les chiffres se rejoignent au centre,
 *     **à leur taille**. On voit d'abord qu'il ne reste qu'eux.
 *  2. **découper** — un vide s'ouvre tous les trois chiffres. Les séries se
 *     séparent d'elles-mêmes : `666 666 666 666 666`. C'est le moment où la
 *     suite cesse d'être un nombre pour devenir un compte.
 *  3. **grossir** — et là seulement. Dès qu'un rang porterait trois séries et
 *     demie, elles se répartissent sur **plusieurs lignes** : c'est la seule
 *     façon de les grossir davantage, puisque chaque ligne devient d'autant
 *     plus courte. Combien de rangs, et de quelle longueur :
 *     `repartirEnLignes`, qui tient les dix cas dictés par l'auteur.
 *
 * Plusieurs lignes ici ne contredisent pas la doctrine du « jamais deux
 * lignes » (`defilement.js`) : celle-ci défend une SÉQUENCE, qui se lit d'un
 * bout à l'autre et qu'une coupure au milieu trahirait. Le verdict n'est pas
 * une séquence, c'est un **compte** — des objets identiques dont l'ordre ne dit
 * rien. Les répartir sur plusieurs rangs ne coupe aucune lecture, et la coupure
 * ne tombe jamais dans une série : toujours entre deux.
 *
 * ## Ce qui a été retiré, et pourquoi
 *
 * Le halo doré derrière chaque chiffre. Un halo dit « regarde ici » ; à
 * l'instant où les chiffres occupent l'essentiel de la scène, il n'y a plus
 * rien d'autre à regarder, et le cartouche ne se lit plus que comme un fond
 * posé sous un chiffre. La palette dit déjà tout ce qu'il y a à dire : les
 * chiffres passent en **rubrique**, la couleur de l'affirmation (design §2.3).
 * `halo: true` le rétablit pour qui en voudrait.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ## L'ORAGE — la scénographie du registre scénique
 *
 * « En thème clair, le passage à un fond noir/lugubre ; puis, quel que soit le
 * thème, un flash d'éclair/foudre qui s'applique au fond ; et un effet
 * d'embrasement animé autour de chaque 666 et chaque 666 à cornes. »
 * (l'auteur)
 *
 * ★ **Ce n'est PAS une op du vocabulaire, et c'est délibéré.** Le vocabulaire
 * §3.1 nomme les GESTES DE LA DÉMONSTRATION — ce qui est fait aux jetons, et
 * dont Le Registre doit rendre compte. La nuit, la foudre et le feu ne font
 * rien à aucun jeton : ils ne changent ni une valeur, ni un rang, ni un
 * compte, et Le Registre n'a rigoureusement rien à en dire. Ce sont des objets
 * du MOTEUR, de la même famille que `@camera` et `@pan` — qui ne sont pas non
 * plus dans le vocabulaire. Les faire entrer aurait eu deux coûts : un
 * vingt-deuxième nom à tenir en trois exemplaires, et surtout un scénario qui
 * ne serait plus le même objet dans les deux registres, alors que c'est
 * précisément ce qu'on veut garantir — même programme, même verdict, même
 * score, deux mises en scène.
 *
 * Elle est donc pilotée par `ctx.scenographie`, une option de COMPILATION,
 * posée par la page qui a lu le lien (`app/pages/demonstration.js`), au même
 * titre que `reduced` et `repeatSpeed`.
 *
 * ★ **Tout est fonction du temps, rien n'est tiré au sort** (CONTRACTS §4.4) :
 * l'éclair est une enveloppe d'opacité écrite à la main, en `values` /
 * `offsets`. Un `Math.random()` aurait donné un éclair différent à chaque
 * lecture — donc un scrubbing qui ne retomberait jamais sur la même image.
 *
 * ★ **Et la nuit tombe DANS LES DEUX THÈMES.** L'auteur ne la demande qu'en
 * thème clair, mais la suite de sa phrase — « puisque maintenant la scène est
 * sur fond sombre dans tous les cas » — dit l'intention : ce qu'il veut, c'est
 * que les trois effets partagent le même fond. On l'obtient en faisant tomber
 * la nuit partout, avec la même couleur : basculement complet en thème clair,
 * approfondissement en thème sombre. Une seule palette de nuit, donc un seul
 * contraste à mesurer (voir `tokens.css`, `--scene-nuit`).
 */

import { targetsOf, ensureHalo } from './helpers.js';
import { poserLesCornes, effriterLesCornes } from './horns.js';
import { EASE } from '../constants.js';

export const name = 'reveal';

/**
 * Longueur d'une série — par DÉFAUT. Le 666 du titre, et rien d'autre.
 *
 * ★ Elle n'est plus une loi : l'op porte un champ `serie`, dérivé de la cible
 * par l'émetteur (`recherche/scenario.js`). Un verdict qui vise `13` se découpe
 * par deux, un `007` par trois. Le défaut reste trois — c'est la longueur de la
 * seule cible que le site promette dans son titre, et c'est ce qu'un scénario
 * écrit avant l'existence des cibles voulait dire.
 */
const SERIE = 3;

/** La longueur de série demandée par l'op, bornée à ce qui a un sens. */
function serieDe(op) {
  const n = op && Number(op.serie);
  return Number.isInteger(n) && n >= 1 && n <= 9 ? n : SERIE;
}

/** Part de la hauteur de scène occupée par la hauteur de capitale du verdict. */
const AIR_VERTICAL = 0.62;

/**
 * Idem, mais pour un verdict sur PLUSIEURS rangs : c'est la hauteur du bloc
 * entier qui est bornée, interligne compris. On peut y prendre plus de place —
 * le verdict est seul en scène, et des rangs serrés se lisent moins bien que
 * des rangs qui respirent.
 */
const AIR_VERTICAL_BLOC = 0.88;

/** Interligne du verdict, en hauteurs de capitale. */
const INTERLIGNE = 1.45;

/** Part de la largeur utile occupée par le verdict. */
const AIR_HORIZONTAL = 0.92;

/**
 * ★ L'AGENCEMENT DES TRIPTYQUES EN RANGS — combien de lignes, et de quelle
 * longueur.
 *
 * **La règle, en une phrase :** *le moins de lignes possible, à condition
 * qu'une ligne porte en moyenne **moins de trois triptyques et demi** ; puis la
 * répartition la plus égale possible, les lignes les plus fournies en tête.*
 *
 * ── Ce que l'auteur a dicté, et ce qu'il a corrigé ────────────────────────
 *
 * Il a d'abord donné dix cas ET la règle qui les gouverne, et les deux ne
 * coïncidaient pas sur sept :
 *
 * > « Minimise la différence de nombre de triptyques entre les lignes, et garde
 * > plus de triptyques par ligne que de lignes. […] 7: 1 ligne de 4 et une de
 * > 3. 8: 2 lignes de 3 et 1 ligne de 2. »
 *
 * Puis il a précisé le critère — « on cherche à minimiser l'écart entre deux
 * lignes, mais aussi l'écart entre le nombre d'items par ligne et le nombre de
 * lignes » —, et ce critère-là dit `3+2+2` pour sept. Interrogé sur la
 * contradiction, il a tranché en faveur de la RÈGLE et corrigé son propre
 * exemple : « OK pour passer 7 en 3+2+2, c'est mieux en effet. » Les dix cas,
 * dans leur version corrigée :
 *
 *     1 → [1]        6 → [3,3]
 *     2 → [2]        7 → [3,2,2]
 *     3 → [3]        8 → [3,3,2]
 *     4 → [2,2]      9 → [3,3,3]
 *     5 → [3,2]     10 → [4,3,3]
 *
 * Ils sont la table de vérité, et ils sont vérifiés tels quels
 * (`tests/verdict-rangs.test.js`).
 *
 * ── Pourquoi « moins de trois et demi », et pourquoi « MOINS » ────────────
 *
 * Le seuil n'est pas choisi, il est ENCADRÉ par les dix cas : `10 → [4,3,3]`
 * fait tenir trois virgule trois triptyques par ligne, il faut donc que le
 * seuil dépasse 3⅓ ; `7 → [3,2,2]` refuse deux lignes de trois et demi en
 * moyenne, il faut donc qu'il n'aille pas au-delà de 3½. Le seuil vit dans
 * `]3⅓ ; 3½]`, et 3½ en est la valeur ronde.
 *
 * ★ **Et la comparaison est STRICTE, ce qui n'est pas un détail : c'est
 * exactement ce qui décide de sept.** Trois triptyques et demi par ligne, c'est
 * la moyenne de `[4,3]` ; accepter l'égalité donne `7 → [4,3]`, la refuser
 * donne `7 → [3,2,2]`. L'auteur a corrigé dans le sens du refus. Écrite en
 * entiers, la règle est donc `lignes = ⌊2n/7⌋ + 1` — soit `⌈2n/7⌉` partout SAUF
 * aux multiples de sept, les seuls où la moyenne tombe pile sur trois et demi.
 *
 * ★ Une fois le nombre de lignes connu, la répartition n'a plus de liberté :
 * `q` par ligne et `r` lignes qui en prennent une de plus, les plus fournies en
 * tête — c'est le seul agencement qui minimise l'écart entre lignes ET fasse
 * descendre la ligne, jamais monter.
 *
 * ⚠ **Au-delà de dix, ce sont des EXTRAPOLATIONS, pas des faits.** L'auteur
 * s'est arrêté à dix ; la règle continue — `11 → 3+3+3+2`, `12 → 3+3+3+3`,
 * `13 → 4+3+3+3`, `14 → 3+3+3+3+2` —, et rien ne dit qu'il les aurait écrits
 * ainsi. C'est d'ailleurs là que sa dernière consigne cède : « garde plus de
 * triptyques par ligne que de lignes » tient sur les dix cas dictés et tombe
 * dès onze (trois par rang pour quatre rangs). Le jour où une moisson en
 * rapportera plus de dix, la question se reposera à l'auteur plutôt qu'ici.
 *
 * ★ **Fonction PURE, exportée, et éprouvée sur les dix cas de l'auteur.** Ce
 * n'est pas une commodité de test : le verdict lit ce découpage TROIS fois — la
 * coupure du flux (`poserLeFlux`), la largeur du rang le plus long
 * (`plusLongRang`) et le rang qui perd ses cornes (`detrones`). Trois lectures
 * d'une même règle recopiée trois fois auraient fini par diverger ; ici il n'y
 * a qu'une source.
 *
 * @param {number} n  nombre de triptyques à agencer
 * @returns {number[]} la longueur de chaque rang, du haut vers le bas
 */
export function repartirEnLignes(n) {
  if (!Number.isInteger(n) || n <= 0) return [];
  // On ajoute des lignes tant qu'une ligne en porterait trois et demi ou plus.
  // Comparaison STRICTE : trois et demi pile, c'est déjà trop (voir l'en-tête).
  let lignes = 1;
  while (n / lignes >= PAR_LIGNE_MAX) lignes++;
  const parLigne = Math.floor(n / lignes);
  const fournies = n % lignes;      // les rangs qui en prennent un de plus
  return Array.from({ length: lignes }, (_, i) => parLigne + (i < fournies ? 1 : 0));
}

/**
 * Le nombre moyen de triptyques qu'une ligne ne doit pas ATTEINDRE.
 *
 * Il n'est pas choisi, il est ENCADRÉ par les dix cas de l'auteur : il lui faut
 * dépasser 3⅓ (`10 → 4+3+3` fait tenir trois virgule trois par ligne) sans
 * dépasser 3½ (`7 → 3+2+2` refuse deux lignes de trois et demi en moyenne).
 * L'intervalle est `]3⅓ ; 3½]`, et 3½ en est la valeur ronde. Voir
 * `repartirEnLignes`.
 */
const PAR_LIGNE_MAX = 3.5;

/**
 * Les rangs où s'ouvre une nouvelle ligne — l'index de la PREMIÈRE série de
 * chaque rang, le premier excepté (rien ne s'ouvre avant lui).
 *
 * Dérivé de `repartirEnLignes`, jamais recalculé : c'est la même règle, lue
 * sous l'angle dont le layout a besoin.
 */
function debutsDeRang(rangs) {
  const out = new Set();
  let acc = 0;
  for (const long of rangs.slice(0, -1)) { acc += long; out.add(acc); }
  return out;
}

/**
 * Le vide qui sépare deux séries — **exactement un blanc**.
 *
 * Pas un écart choisi à l'œil : la chasse est fixe (JetBrains Mono), donc
 * « 666 666 » écrit à la main mettrait un caractère d'espace entre les deux, et
 * la distance de centre à centre y serait le double de celle qui sépare deux
 * chiffres voisins. C'est cette distance-là que le découpage reproduit. Le
 * lecteur ne voit pas une séparation décorative, il voit une espace.
 */
function videDeSerie(ctx) {
  return 2 * ctx.layoutOpts.gap + ctx.metrics.advance;
}

/** Garde-fou : au-delà, un glyphe unique deviendrait grotesque. */
const ZOOM_MAX = 14;

/**
 * ★ L'ÉCLAIR — **deux** éclats, et pas un de plus.
 *
 * WCAG 2.3.1 (« Trois flashs ou moins ») interdit plus de trois éclats dans
 * une seconde quelconque, dès lors que la surface qui clignote dépasse un
 * certain angle — et ici elle occupe la scène entière. L'enveloppe compte donc
 * **deux** crêtes, sur une animation qui ne se répète jamais : deux dans la
 * seconde, sous le seuil de trois, quelle que soit la fenêtre d'une seconde
 * qu'on y promène.
 *
 * Ce n'est pas seulement une case à cocher : deux éclats, c'est aussi ce que
 * fait la foudre. Un stroboscope ne ressemble pas à un orage.
 *
 * La seconde crête est plus faible et plus courte que la première — la
 * décharge de retour —, et la queue s'éteint lentement. Le plafond à 0,55
 * laisse la nuit transparaître : un blanc plein effacerait le 666 pendant
 * l'éclair, c'est-à-dire cacherait la chute au moment de la chute.
 */
const ECLAIR = Object.freeze({
  offsets: [0, 0.05, 0.13, 0.21, 0.30, 0.46, 1],
  valeurs: [0, 0.55, 0.08, 0.38, 0.05, 0.015, 0],
});

/**
 * ★ L'EMBRASEMENT — ce que la TIMELINE en dit, et ce qu'elle n'en dit plus.
 *
 * L'enveloppe ne compte plus que **deux paliers** : éteint, puis pris. Elle ne
 * fait plus vaciller le feu, et c'est le cœur du changement demandé par
 * l'auteur — « l'effet de feu doit perdurer et rester animé une fois le verdict
 * terminé ».
 *
 * **Le raisonnement, parce qu'il touche à CONTRACTS §3.** Tant que le
 * vacillement était une enveloppe d'opacité compilée, il finissait
 * mécaniquement avec la timeline : le dernier palier atteint, plus rien ne
 * bougeait. Un feu qui s'arrête net à la dernière image n'est pas un feu.
 *
 * On sépare donc deux choses que l'ancienne enveloppe confondait :
 *
 *  · **la PRÉSENCE du feu** — a-t-il pris, oui ou non ? C'est un état de la
 *    démonstration, il reste **fonction du temps de la timeline** : une seule
 *    montée d'opacité, `forwards`, que `seek()` en arrière ramène à zéro. Le
 *    scrubbing est aussi exact qu'avant, et il l'est plus simplement ;
 *  · **le VACILLEMENT** — la forme des flammes à un instant donné. Ce n'est
 *    **pas** un état de la démonstration : aucune valeur, aucun rang, aucun
 *    compte n'en dépend, et Le Registre n'a rigoureusement rien à en dire.
 *    C'est très exactement l'argument qui garde l'orage hors du vocabulaire
 *    (§3.1). Il n'a donc pas à être une fonction du temps de la timeline, et
 *    **parce qu'il ne l'est pas, il survit à la fin de la lecture** : ce sont
 *    des `@keyframes` CSS autonomes (`pages.css`, `primitives/feu.js`).
 *
 * Ce qu'il faut alors garantir — et qui l'est — c'est qu'**aucune boucle ne
 * tourne dans le vide** : les animations CSS sont `paused` par défaut, et c'est
 * l'attribut `data-embrasement` de la racine de la scène, posé par `player.js`
 * en fonction de `currentTime`, qui les met en marche. Revenir avant le verdict
 * le retire, et le feu s'immobilise au lieu de boucler sous une opacité nulle.
 *
 * L'opacité de crête ne monte pas au-delà de **0,78** : le feu est peint
 * DERRIÈRE les chiffres (couche `back`), et un aplat opaque y ferait tomber le
 * contraste de la rubrique de nuit — 7,4:1 par construction (`tokens.css`) —
 * bien en dessous du 4,5:1 de design §5.1, à l'instant exact où le verdict se
 * lit. La nuit doit transparaître à travers les flammes.
 */
const BRASIER = Object.freeze({
  /**
   * Opacité du feu une fois pris.
   *
   * ★ Elle monte à un — le feu n'est plus bridé par le contraste, et c'est une
   * propriété de la technique et non un réglage : `drop-shadow()` peint
   * DERRIÈRE l'élément qui la porte, et cet élément est une copie du glyphe
   * remplie de la couleur de nuit. Le vrai chiffre repose donc sur du fond pur,
   * où il tient ses 7,4:1 (`tokens.css`), quelle que soit l'ardeur du feu.
   * Les deux tentatives précédentes devaient acheter leur lisibilité en pâlissant
   * leurs flammes ; celle-ci n'a rien à acheter.
   */
  intensite: 1,
});

export function plan(ctx) {
  const ids = targetsOf(ctx);
  const withHalo = ctx.op.halo === true;
  const efface = ctx.op.clear !== false;

  // Combien de 666 ? Un découpage n'a de sens que si la suite EST faite de
  // séries entières — sinon on n'invente pas des frontières qui n'existent pas.
  const series = decouperEnSeries(ids, serieDe(ctx.op));
  const multi = series.length > 1;
  // L'agencement en rangs, calculé UNE fois et lu partout — voir
  // `repartirEnLignes` pour la règle et pour ce qui l'a dictée.
  const rangs = repartirEnLignes(series.length);
  const lignes = rangs.length;
  // ★ Le regroupement est INUTILE quand les triptyques sont déjà là.
  //
  // « Quand le ou les triptyques sont déjà formés (et cornés), tu peux faire
  // une transformation plus directe pour les amener à leur position finale sans
  // passer par l'étape regroupement, puisqu'ils sont déjà en triptyque »
  // (l'auteur).
  //
  // Les deux premiers temps du verdict — rassembler, puis découper tous les
  // trois chiffres — servent à rendre VISIBLE une structure qui ne l'est pas :
  // quinze 6 alignés ne se lisent pas comme cinq séries tant que rien ne les
  // sépare. Mais quand chaque série porte déjà ses cornes, le découpage est
  // sous les yeux depuis longtemps ; le rejouer, c'est défaire puis refaire ce
  // que le spectateur a déjà vu se faire.
  //
  // Le critère est OBSERVÉ, pas supposé : on demande à la scène si chaque série
  // porte un décor de cornes, sur l'un quelconque de ses chiffres. Un triptyque
  // contigu mais nu repasse par les trois temps — c'est bien qu'il n'a jamais
  // été montré comme tel.
  //
  // ★ « L'UN QUELCONQUE », et non plus « le 6 du milieu » : une corne est
  // accrochée au 6 qu'elle couronne, donc aux DEUX chiffres extérieurs, et le
  // médian n'en porte aucune (`primitives/horns.js`, « UNE CORNE, UN NŒUD »).
  const porteDesCornes = (id) => ctx.scene.accrochesA(id).some(
    (d) => { const n = ctx.scene.get(d); return n && n.role === 'horns'; },
  );
  const couronnes = multi && series.every((s) => s.some(porteDesCornes));

  // ★ LES TRIPTYQUES QUE LA DÉMONSTRATION N'A PAS PU COURONNER LE SONT ICI.
  //
  // « "e-h" n'aura ses cornes qu'à l'étape verdict puisque les 6 ne sont pas
  // réunis avant » (l'auteur). Un 666 dont les trois chiffres ne se touchent
  // jamais en cours de route — parce qu'une ponctuation les sépare, parce
  // qu'ils viennent de portées disjointes, parce que c'est le tri qui les
  // rapproche — ne peut pas être couronné plus tôt : la démonstration ne
  // couronne que ce qu'elle CONSTATE (`recherche/scenario.js ›
  // couronnerLesTriptyques`). Le verdict, lui, les réunit — et c'est le moment
  // où le 666 est enfin sous les yeux, donc le moment de le dire.
  //
  // ★ **Cinq restrictions, et chacune répond à une phrase de l'auteur.**
  //
  //  1. **Le registre SCÉNIQUE, jamais le sobre.** « Sous "sobre", il reste
  //     sans orage mais perd ses cornes » (CONTRACTS §3.1). Le scénario sobre a
  //     déjà vu ses couronnements réécrits en simple désignation
  //     (`sobrifierLesCornes`, `recherche/scenario.js`) ; en remettre au verdict
  //     rendrait par la fenêtre ce que le registre a sorti par la porte.
  //     `ctx.scenographie` EST le registre — la page le pose depuis le même
  //     booléen que l'orage et le son (`app/pages/demonstration.js`).
  //  2. **PLUSIEURS séries, jamais un 666 seul.** La phrase de l'auteur commence
  //     par « quand il y a plusieurs séries de 666 », et ce n'est pas un hasard
  //     de formulation : les cornes servent alors à faire LIRE chaque triptyque
  //     comme un 666 distinct — le même service que le découpage. Un 666 seul
  //     n'a personne dont il faille le distinguer, et il paierait cher : poser
  //     un décor au-dessus des chiffres, c'est leur prendre de la hauteur
  //     (voir `zoomDuVerdict`), et un 666 seul tombe de ×8,5 à ×4,8. On ne
  //     réduit pas la chute de moitié pour souligner ce que rien ne concurrence.
  //     Un 666 seul QUE LA DÉMONSTRATION A COURONNÉ garde évidemment ses
  //     cornes : elles ont été gagnées en chemin, et le zoom en tient compte
  //     depuis toujours.
  //  3. **Seulement ceux qui n'en portent pas.** On ne recouronne rien : un
  //     nœud de cornes est nommé d'après le 6 qu'il couronne, deux couronnements
  //     sur un même chiffre se disputeraient le même identifiant.
  //  4. **Seulement le rang du HAUT.** « Quand il y a plusieurs séries de 666,
  //     [les cornes] seulement sur les 666 de la ligne du haut. » Couronner le
  //     rang du bas pour l'en dépouiller trois lignes plus loin (`detrones`)
  //     serait faire puis défaire ; on ne le fait pas.
  //  5. **Seulement trois « 6 ».** Le contrôle croisé n'est pas relâché parce
  //     qu'on change d'endroit : `horns` refuse de couronner autre chose que
  //     trois 6 (CONTRACTS §0.3), et ce refus vaut ici aussi. La contiguïté,
  //     elle, n'a pas à être vérifiée — c'est le verdict LUI-MÊME qui pose ces
  //     trois chiffres côte à côte, quelques lignes plus bas (`poserLeFlux`),
  //     et une série est un triptyque par construction (`decouperEnSeries`).
  //
  // ★ Et le geste n'est pas tout à fait le même qu'en cours de route : là, la
  // corne JAILLIT du chiffre (`scale` 0 → 1) ; ici elle PARAÎT à sa taille et
  // grandit avec lui, portée par l'homothétie du verdict (`animSolidaire`).
  // Deux animations de `scale` sur le même nœud se recouvriraient, et c'est
  // exactement ce que le compilateur signale comme concurrence.
  //
  // ★ Le rang du bas, calculé UNE fois : tout ce qui vient après la dernière
  // série du PREMIER rang y est. La longueur de ce rang vient de
  // `repartirEnLignes`, comme la coupure de `poserLeFlux` et celle des
  // détrônées, plus bas. Trois lectures d'une seule règle.
  const rangDuBas = lignes > 1 ? rangs[0] : Infinity;
  const cornesDuVerdict = [];
  series.forEach((serie, s) => {
    if (!ctx.scenographie || !multi || s >= rangDuBas) return;
    if (serie.length !== SERIE) return;
    if (serie.some(porteDesCornes)) return;
    if (!serie.every((id) => String(ctx.scene.live(id, ctx.where).text) === '6')) return;
    cornesDuVerdict.push(...poserLesCornes(ctx, serie, { echelle: 1 }));
  });

  // ★ Le zoom vient APRÈS, et il le faut : `debordDuDecor` mesure ce que le
  //   décor prend en hauteur, et les cornes qu'on vient de poser en font partie.
  //   Les compter après les avoir posées, c'est la garantie que leurs pointes
  //   ne sortiront pas du cadre — le verdict paie en TAILLE, pas en débordement.
  const grow = typeof ctx.op.scale === 'number'
    ? ctx.op.scale
    : zoomDuVerdict(ctx, ids, series, rangs);

  // Quinze chiffres à 150 ms d'écart, ce sont deux secondes rien que pour les
  // allumer. La cadence se resserre avec le nombre : c'est le même geste, il
  // dure le même temps.
  const stagger = ctx.stagger || (ctx.reduced ? 0 : ctx.dur * 0.18);
  const cadence = ids.length > 1
    ? Math.min(stagger, (ctx.dur * 0.5) / (ids.length - 1))
    : stagger;

  // --- 1. ce qui n'est pas le verdict quitte la scène -----------------------
  const restes = efface ? ctx.scene.flow.filter((id) => !ids.includes(id)) : [];
  const fonduRestes = Math.max(1, ctx.dur * 0.3);
  const cadenceRestes = restes.length > 1 ? (ctx.dur * 0.22) / (restes.length - 1) : 0;
  restes.forEach((id, i) => {
    const at = i * cadenceRestes;
    // Un décor accroché s'en va avec ce qu'il désignait : le halo, comme toute
    // autre marque posée sur le jeton. Le laisser survivre à sa cible ferait
    // flotter une désignation orpheline au milieu du verdict — et le faire
    // partir plus vite (c'était 0,7 fois la durée, sans courbe déclarée) fait
    // s'annuler la désignation avant son objet. Même départ, même durée, même
    // courbe, sur les deux canaux : `animSolidaire`.
    ctx.animSolidaire({ id, prop: 'opacity', to: 0, at, dur: fonduRestes, ease: EASE.fade });
    ctx.animSolidaire({ id, prop: 'scale', to: 0.8, at, dur: fonduRestes, ease: EASE.fade });
    ctx.scene.kill(id, ctx.where);
  });

  // ★ Les halos naissent ICI, avant tout déplacement — pas dans la boucle qui
  // les allume. Un décor accroché ne suit son jeton au reflow que s'il EXISTE
  // au moment où celui-ci part : créé après, il était simplement posé à
  // l'arrivée, sans animation, et sautait donc à sa place pendant que son
  // chiffre, lui, y voyageait. Même famille de défaut que les courbes qui
  // divergent, et même remède — le décor partage tout, y compris son instant
  // de naissance.
  const halos = withHalo ? ids.map((id) => ensureHalo(ctx, id, 'gold')) : [];

  // ★ ET L'ORAGE NAÎT ICI AUSSI, pour la même raison : un décor accroché
  //   partage l'instant de naissance de ce qu'il suit (CONTRACTS §3.2 règle
  //   10). Un brasier créé après le regroupement serait posé d'un coup à
  //   l'arrivée pendant que son chiffre, lui, y voyagerait.
  const orage = ctx.scenographie ? monterLOrage(ctx, ids, grow) : null;

  // --- 2. le regroupement : quand le canal est libre, et pas avant ----------
  //
  // ★ Un `move` peut précéder `reveal` dans le même step (le scénario du
  // verdict en émet un). Deux animations concurrentes sur `translate`
  // s'écraseraient l'une l'autre et se contrediraient à l'écran : on attend
  // donc que la précédente ait fini (`ctx.libreA`). L'effacement, lui, a
  // commencé tout de suite — on efface AVANT de grouper.
  let depart = ctx.dur * 0.34;
  for (const id of ids) depart = Math.max(depart, ctx.libreA(id, 'translate'));
  depart = Math.min(depart, ctx.dur * 0.75);

  // ★ Le verdict rend son centre à la ligne. `partition` avait décalé le cadrage
  // pour garder le DÉCOUPAGE au milieu de la vue pendant que le reste était
  // estompé (`layoutOpts.decalage`, voir `layout.js`) ; ici il n'y a plus ni
  // groupes ni reste — des chiffres, et rien d'autre à regarder. Le report est
  // donc levé, et il l'est pendant le geste qui rassemble.
  ctx.layoutOpts.decalage = 0;

  // ★ Le décor accroché déborde VERS LE HAUT et rien ne le contrebalance en
  // bas : le bloc « cornes + chiffres » n'a pas son milieu sur les chiffres. On
  // descend donc la ligne de la moitié de ce débord, pour que ce soit le BLOC
  // — ce qu'on regarde — qui soit centré, et non l'ancre des glyphes. Même
  // raison que `layoutOpts.decalage` pour le découpage, et même signature : un
  // report, pas un placement à la main. Zéro quand il n'y a pas de décor.
  const report = Math.max(0, debordDuDecor(ctx, ids) - hauteurDeCapitale(ctx) / 2) * grow / 2;
  const centrerLeBloc = () => {
    ctx.layoutOpts.centerY = ctx.layoutOpts.viewBox.y + ctx.layoutOpts.viewBox.h / 2 + report;
  };

  let tGrossir;
  let dGrossir;

  // ★ UNE SEULE COURBE POUR TOUT L'AGRANDISSEMENT — c'est ce qui rend le geste
  // SOLIDAIRE, et ce n'est pas un réglage d'esthète.
  //
  // Le verdict grossit le groupe par DEUX canaux à la fois : `translate`
  // écarte les chiffres, `scale` grossit les glyphes. Le décor accroché, lui,
  // n'en a qu'un — son `scale`, qui porte à la fois sa taille et sa largeur.
  // Tant que les deux canaux marchaient sur deux courbes (`move` pour les
  // positions, `pop` pour les tailles), l'ensemble n'était une homothétie
  // qu'aux deux extrémités du trajet : au milieu, `pop` avait déjà dépassé sa
  // valeur d'arrivée quand `move` n'était qu'à mi-chemin. Les cornes étaient
  // donc trop larges pour l'écartement des 6 qu'elles couronnaient — la
  // déformation signalée par l'auteur —, et les chiffres eux-mêmes se
  // chevauchaient, leur chasse ayant grandi plus vite que leurs écarts.
  //
  // Avec une seule courbe `u(t)`, l'exactitude est ARITHMÉTIQUE et non
  // approchée : le layout amène chaque jeton de `p₀` à `p₁ = c + (p₀ − c)·G`
  // autour du centre `c`, donc `p(t) = p₀ + (p₁ − p₀)·u = c + (p₀ − c)·(1 +
  // (G − 1)·u)`, tandis que son échelle vaut `1 + (G − 1)·u`. Les deux
  // portent le même facteur à chaque instant : le groupe est une homothétie
  // exacte tout au long du trajet, dépassement compris. On garde donc `pop`
  // — le coup de poing du verdict —, mais sur les DEUX canaux.
  const courbeVerdict = EASE.pop;

  if (!multi || couronnes) {
    // Un seul 666 : rassembler et grossir sont le MÊME geste. Rien à découper,
    // rien à répartir, et l'intercaler ferait un temps mort au moment de la
    // chute.
    //
    // Des triptyques déjà couronnés : même conclusion pour une autre raison —
    // il n'y a rien à rendre visible, tout l'est. Un seul trajet les mène de là
    // où ils sont à leur place finale, séparations et rangs compris. C'est le
    // geste le plus direct, et c'est ce que l'auteur demande.
    tGrossir = depart;
    dGrossir = Math.max(1, ctx.dur - depart);
    poserLeFlux(ctx, ids, series, { echelle: grow, separation: true, rangs });
    centrerLeBloc();
    ctx.reflow({ at: tGrossir, dur: dGrossir, ease: courbeVerdict });
  } else {
    const pas = Math.max(1, ctx.dur * 0.6);

    // (a) rassembler — à leur taille. On voit qu'il ne reste qu'eux.
    poserLeFlux(ctx, ids, series, { echelle: 1, separation: false, rangs: [series.length] });
    ctx.reflow({ at: depart, dur: pas, ease: EASE.move });

    // (b) découper — le vide s'ouvre tous les trois chiffres.
    poserLeFlux(ctx, ids, series, { echelle: 1, separation: true, rangs: [series.length] });
    ctx.reflow({ at: depart + pas, dur: pas, ease: EASE.move });

    // (c) grossir — et se répartir sur deux rangs s'il y a de quoi.
    tGrossir = depart + 2 * pas;
    dGrossir = Math.max(1, pas * 1.5);
    poserLeFlux(ctx, ids, series, { echelle: grow, separation: true, rangs });
    centrerLeBloc();
    ctx.reflow({ at: tGrossir, dur: dGrossir, ease: courbeVerdict });
  }

  // La hauteur réelle du verdict, pour que ce qui se pose « en dessous » (une
  // annotation) se pose bien en dessous et non au milieu des chiffres.
  const hauteur = ctx.metrics.fontSize * grow;
  for (const id of ids) {
    const p = ctx.scene.pos(id);
    if (p) p.h = hauteur;
  }

  // --- 3. ils paraissent, rougissent, et grandissent ------------------------
  // ★ Au-delà de trois séries, les cornes ne couronnent QUE LE RANG DU HAUT.
  //
  // « Quand il y a plusieurs séries de 666, [les cornes] seulement sur les 666
  // de la ligne du haut, pour éviter de surcharger en effet » (l'auteur). Cinq
  // paires de cornes sur deux rangs, ce n'est plus une trouvaille qu'on
  // souligne, c'est un motif de papier peint. Sur un seul rang, tous ceux qui
  // sont couronnés le restent : il n'y a rien à alléger.
  //
  // ★ Et ce sont les CORNES qui se retirent, pas tout le décor. L'embrasement
  //   du rang du bas reste : la surcharge que l'auteur veut éviter, c'est
  //   « cinq paires de cornes sur deux rangs », un motif de papier peint fait
  //   d'un dessin répété. Une lueur n'est pas un motif — trois lueurs voisines
  //   se fondent en une seule —, et un 666 qui brûlerait sur un rang mais pas
  //   sur l'autre dirait qu'il y en a deux sortes.
  //
  // ★ Et elles ne s'ÉTEIGNENT pas, elles s'EFFRITENT — « au verdict, au moment
  //   de l'agencement, fais s'effriter/disparaître progressivement les cornes
  //   des triptyques qui vont en 2ⁿᵈ ligne » (l'auteur). Voir
  //   `horns.js › effriterLesCornes`. L'ordre de la liste est celui de la
  //   lecture : c'est lui qui décale les effritements les uns par rapport aux
  //   autres.
  const detrones = [];
  series.forEach((serie, s) => {
    if (s < rangDuBas) return;
    for (const id of serie) {
      for (const sid of ctx.scene.accrochesA(id)) {
        const n = ctx.scene.get(sid);
        if (n && n.role === 'horns' && !detrones.includes(sid)) detrones.push(sid);
      }
    }
  });

  // ★ SOUS LA NUIT, C'EST LA RUBRIQUE DE NUIT — et c'est une question de
  //   lisibilité, pas de goût. La rubrique du thème clair est un rouge sombre
  //   fait pour le parchemin (#A32218) : sur le fond lugubre elle tombe à
  //   2,7:1, c'est-à-dire illisible à l'instant exact où la démonstration
  //   livre sa chute. `--scene-rubric` y tient 7,4:1 (voir `tokens.css`).
  //   Hors scénographie, rien ne change : le fond n'a pas bougé.
  const encreDuVerdict = ctx.scenographie ? ctx.palette.rubricNuit : ctx.palette.rubric;

  ids.forEach((id, i) => {
    const at = i * cadence;
    ctx.anim({ id, prop: 'opacity', to: 1, at, dur: Math.max(1, ctx.dur * 0.3) });
    // ★ Les CORNES passent à la même encre, au même instant, sur la même
    //   courbe. Elles ont pris la rubrique du thème au couronnement, sous le
    //   fond du thème ; la nuit tombée, elles disparaîtraient dans le noir en
    //   thème clair. `animSolidaire` est exactement l'outil de ce cas : un
    //   décor accroché partage ce qui bouge (§3.2 règle 10). Hors
    //   scénographie, on garde `anim` — il n'y a rien à emmener.
    const peindre = ctx.scenographie ? ctx.animSolidaire : ctx.anim;
    peindre({ id, prop: 'fill', to: encreDuVerdict, at, dur: Math.max(1, ctx.dur * 0.45) });
    // ★ Ce qui est POSÉ SUR un chiffre grandit avec lui — les cornes du 666.
    //
    // Le verdict grossit les glyphes ET leurs écarts du même facteur, sur une
    // seule et même courbe (voir `courbeVerdict`) : le groupe entier subit une
    // homothétie autour de son centre, qui est l'ancre du décor. Un simple
    // `scale` suffit donc, sans arithmétique de rattrapage. Sans lui, les
    // cornes resteraient à leur taille au-dessus de chiffres huit fois plus
    // hauts — c'est-à-dire quelque part au milieu d'eux.
    //
    // ★ Le halo, lui, n'a plus à être nommé : c'est un décor accroché
    // (`@halo:<id>`, `scene.satellitesDe`), donc `animSolidaire` le fait
    // grandir avec son chiffre. Ne reste que son allumage, qui n'appartient
    // qu'à lui.
    if (halos[i]) ctx.anim({ id: halos[i], prop: 'opacity', to: 0.24, at, dur: Math.max(1, ctx.dur * 0.45) });
    ctx.animSolidaire({ id, prop: 'scale', to: grow, at: tGrossir, dur: dGrossir, ease: courbeVerdict });
  });

  // ★ Les cornes des rangs du bas S'EFFRITENT — pendant l'agencement, et pas une
  //   milliseconde avant ni après : elles se rongent depuis la pointe tandis que
  //   leur 666 descend et grossit, et il ne reste rien d'elles quand la scène
  //   s'immobilise. Elles gardent jusqu'au bout le `scale` que `animSolidaire`
  //   vient de leur donner — rien ne se désolidarise, il n'y a bientôt plus rien
  //   à tenir.
  //
  //   Le geste passe par le TRACÉ (canal discret, fonction pure du temps de la
  //   timeline) et non par l'opacité : le nœud porte l'échelle du verdict, et
  //   une opacité — ou un `filter` — animée sur un élément transformé est la
  //   recette même du défaut de composition (`tests/compositeur.test.js`, et
  //   les saccades mesurées du feu plus bas). Voir `horns.js › corneEffritee`.
  //   Le geste s'achève un peu avant la fin du mouvement : une corne qui finit
  //   de s'émietter après l'arrêt de la scène se lit comme un oubli.
  if (detrones.length) {
    effriterLesCornes(ctx, detrones, { at: tGrossir, dur: Math.max(1, dGrossir * 0.85) });
  }

  // ★ Et celles que le verdict vient de poser PARAISSENT — au moment où les
  //   chiffres grossissent, sur la même horloge. Elles n'ont pas de `scale` à
  //   elles : `animSolidaire` (juste au-dessus) leur a déjà donné celui de leur
  //   6, et c'est ce qui les tient calées. Il ne leur reste qu'à se montrer.
  for (const sid of cornesDuVerdict) {
    ctx.anim({ id: sid, prop: 'opacity', to: 1, at: tGrossir, dur: Math.max(1, dGrossir * 0.6) });
  }

  /* ★ L'ORAGE N'ÉCLATE QU'UNE FOIS LE MOUVEMENT FINI — et c'est un correctif
     de FLUIDITÉ avant d'être une intention de mise en scène.

     « Sur Chromium : l'animation du feu est là au moment attendu, mais le
     grossissement saccade — quatre ou cinq micro-freezes pendant le zoom. Sur
     Firefox : le grossissement se fait avec un effet de flamme statique, puis
     une fois à la taille cible, un long freeze de deux ou trois secondes avant
     que les flammes ne s'animent » (l'auteur).

     Deux symptômes, une seule cause. Le feu prenait à 0,36·d tandis que le
     grossissement courait de 0,34·d à 1,00·d : il brûlait donc PENDANT tout le
     mouvement. Or un `filter` s'applique dans l'espace utilisateur : quand le
     nœud grandit, sa chaîne de flous doit être re-tramée à la nouvelle échelle.
     Chromium le fait honnêtement, à chaque palier — d'où les saccades.
     Firefox garde l'image tramée et la met à l'échelle — d'où la flamme figée
     pendant la montée — puis paie tout d'un coup à l'arrivée, d'où le gel.

     Le remède ne touche ni au dessin ni au coût : il déplace le travail. Plus
     rien n'est filtré tant que ça bouge, et le tramage a lieu une seule fois,
     à la taille définitive, quand la scène est immobile.

     Et la dramaturgie y gagne : le 666 se met en place, PUIS la foudre tombe
     dessus, PUIS il s'embrase. C'est l'ordre qu'on attend d'une chute. */
  if (orage) allumerLOrage(ctx, orage, tGrossir + dGrossir);
}

/* ══════════════════════════════ L'ORAGE ═══════════════════════════════════ */

/**
 * Crée les nœuds de l'orage — sans rien animer encore.
 *
 * Séparé de l'allumage pour une raison de contrat et non de style : un décor
 * accroché doit **exister avant le premier déplacement** de ce qu'il suit
 * (CONTRACTS §3.2 règle 10), et le regroupement du verdict a lieu bien avant
 * que le feu ne prenne. La naissance est donc appelée en tête de `plan`,
 * l'allumage à la fin.
 *
 * @returns {{nuit:string, eclair:?string, brasiers:string[]}}
 */
function monterLOrage(ctx, ids, grow = 1) {
  const vb = ctx.layoutOpts.viewBox;
  // Trois fois la scène : voir `dom.js`, rôle « nuit ». Un aplat uni ne se
  // paie pas au pixel, et l'on est certain qu'aucun bord ne se découvrira.
  const w = vb.w * 3;
  const h = vb.h * 3;
  const centre = { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 };

  const aplat = (id, role, couleur) => {
    if (!ctx.scene.has(id)) {
      ctx.scene.create({
        id, role, inFlow: false, w,
        data: { w, h },
        base: { opacity: 0, fill: couleur },
      }, { where: ctx.where });
    }
    ctx.place(id, { x: centre.x, y: centre.y, w, h });
    return id;
  };

  const nuit = aplat('@nuit', 'nuit', ctx.palette.nuit);
  // ★ Pas d'éclair en mouvement réduit. Une enveloppe compilée à 1 ms n'est
  //   plus un éclair, c'est une image blanche d'une frame — c'est-à-dire très
  //   exactement ce que `prefers-reduced-motion` existe pour épargner. La
  //   nuit, elle, reste : ce n'est pas un mouvement, c'est un état.
  const eclair = ctx.reduced ? null : aplat('@eclair', 'eclair', ctx.palette.eclair);

  const fs = ctx.metrics.fontSize;
  const advance = ctx.metrics.advance;
  const brasiers = ids.map((id) => {
    const bid = `@brasier:${id}`;
    if (!ctx.scene.has(bid)) {
      const jeton = ctx.scene.get(id);
      // ★ LA CORNE BRÛLE AVEC SON 6. On relit son TRACÉ, et rien d'autre : le
      //   nœud des cornes n'est ni déplacé, ni redessiné, ni même touché. Le
      //   calage durement gagné — la corne pousse dans le prolongement exact du
      //   flanc du 6, dérivé de la police, vérifié en CI (`cornes.test.js`) —
      //   ne peut donc pas bouger. Les deux corps partagent en outre le même
      //   repère et la même échelle, puisqu'ils suivent tous deux le même
      //   chiffre (`data.suit`) : il n'y a aucune arithmétique de rattrapage.
      const corne = ctx.scene.accrochesA(id)
        .map((sid) => ctx.scene.get(sid))
        .find((n) => n && n.role === 'horns');
      ctx.scene.create({
        id: bid,
        role: 'brasier',
        inFlow: false,
        w: advance,
        // ★ `suit` fait du feu un SATELLITE du chiffre : il le suit à chaque
        //   reflow et grandit avec lui au verdict, exactement comme une corne.
        //   C'est ce qui rend le calage incassable — un feu qui a la FORME du
        //   chiffre ne peut pas se permettre de s'en décrocher d'un demi-pixel.
        //
        //   ★ Et pas de `debord` : `reveal` s'en sert pour RÉTRÉCIR le verdict
        //   afin qu'un décor pointu ne sorte pas du cadre. Des flammes n'ont
        //   pas de bord à respecter — un feu qui déborde du cadre est même ce
        //   qu'on veut voir. Le déclarer ferait payer au 666 une taille qu'il
        //   n'a aucune raison de perdre.
        data: {
          suit: id,
          couleur: ctx.palette.brasier,
          // ★ Le TEXTE du chiffre, pris en instantané. C'est lui que les échos
          //   redessinent : le feu a la forme du glyphe parce qu'il EST le
          //   glyphe (`primitives/feu.js`). Licite ici et nulle part ailleurs —
          //   le feu ne naît qu'au verdict, où plus rien ne transforme les
          //   chiffres : ils ne font que grossir.
          texte: (jeton && jeton.text) || '',
          fontSize: fs,
          advance,
          // ★ Le grossissement que ce feu subira. Il ne change pas le dessin :
          //   il sert au PLAFOND de flou, qui s'exprime en pixels rendus et
          //   doit donc savoir de combien le repère local sera multiplié
          //   (`primitives/feu.js`, `PLAFOND_FLOU_RENDU`).
          echelle: grow,
          corne: corne ? corne.data.d : null,
        },
        // ★ `fill` doit figurer dans la base, même si chaque écho porte la
        //   sienne. Sans elle, `lastValue` (compile.js) retombe sur
        //   `DEFAULT_BASE`, qui n'a pas de couleur, donc sur `0` : le navigateur
        //   refuse la keyframe (« Invalid keyframe value for property fill: 0 »)
        //   et l'animation est jetée EN SILENCE. Six brasiers muets sur
        //   « Donald Trump », quinze sur `hope-hope-hope.fr`, sans qu'aucun test
        //   ne s'en aperçoive.
        base: { opacity: 0, fill: ctx.palette.brasier },
      }, { where: ctx.where });
    }
    const p = ctx.scene.pos(id);
    // ★ LE FEU EST POSÉ EXACTEMENT SUR SON CHIFFRE, sans le moindre report.
    //   C'est le contraire de la version précédente, qui asseyait un foyer sous
    //   la ligne d'écriture : ici les échos SONT le glyphe, donc ils doivent
    //   partir de sa place au pixel près. Un décalage, même d'une unité, ferait
    //   un liseré au lieu d'une flamme.
    if (p) ctx.place(bid, { x: p.x, y: p.y, w: advance, h: fs });
    return bid;
  });

  return { nuit, eclair, brasiers };
}

/**
 * Allume l'orage. Trois temps, et ils se suivent dans l'ordre où on les lit :
 * **la nuit tombe**, **la foudre frappe**, **le feu prend**.
 *
 * Le feu part APRÈS l'éclair, pas avant : dans cet ordre, c'est la foudre qui
 * met le feu, et l'orage raconte quelque chose. Dans l'autre, ce sont trois
 * effets posés côte à côte.
 */
/**
 * @param {number} apresLeMouvement  l'instant où le grossissement s'achève.
 *        La foudre et le feu s'y accrochent : rien de filtré ne doit paraître
 *        tant que la scène bouge (voir le long commentaire de l'appelant).
 */
function allumerLOrage(ctx, { nuit, eclair, brasiers }, apresLeMouvement) {
  const d = ctx.dur;
  const calme = Math.max(0, apresLeMouvement);
  /* ★ L'ORAGE S'AJOUTE AU MOUVEMENT — il ne se glisse plus dedans.
     Une première rédaction lui prenait sa place SUR le grossissement, pour que
     sobre et scénique gardent la même durée. L'auteur a tranché : « je lève la
     contrainte "la scénographie n'allonge jamais la démonstration" ; la vitesse
     du grossissement était très bien, ne l'accélère pas. »
     Le 666 se pose donc à son rythme, PUIS l'orage éclate, et le registre
     scénique dure plus longtemps que le sobre. C'est le prix d'une chute, et il
     est assumé (CONTRACTS §3.1). */
  const fenetre = Math.max(1, d * 0.55);

  // 1. LA NUIT — d'abord, et vite : tout le reste se joue dessus. C'est le
  //    seul temps qui survit au mouvement réduit, parce que c'est un état.
  ctx.anim({ id: nuit, prop: 'opacity', to: 1, at: 0, dur: Math.max(1, d * 0.26), ease: EASE.fade });

  // 2. LA FOUDRE — juste après, sur un fond déjà sombre. L'enveloppe est
  //    écrite à la main (`ECLAIR`), donc fonction du temps et rien d'autre.
  if (eclair) {
    // Elle mord un peu sur la fin du mouvement — l'éclair est un aplat sans
    // filtre, il ne coûte rien à re-tramer — pour que la foudre ait FRAPPÉ
    // quand le feu prend, et non l'inverse.
    ctx.anim({
      id: eclair, prop: 'opacity',
      values: ECLAIR.valeurs, offsets: ECLAIR.offsets,
      at: Math.max(0, calme - fenetre * 0.3), dur: Math.max(1, fenetre * 0.9), ease: EASE.linear,
    });
  }

  // 3. LE FEU — il prend là où la foudre a frappé, et il ne s'éteint plus.
  //
  //    ★ UNE SEULE MONTÉE, et c'est tout ce que la timeline en dit. Le feu
  //    « prend » — c'est un état, il est fonction du temps et `seek()` en
  //    arrière le ramène à zéro. Sa VIE, elle, est ailleurs : dans les
  //    `@keyframes` autonomes de `pages.css`, gouvernées par l'attribut
  //    `data-embrasement` (voir le long commentaire de `BRASIER` ci-dessus).
  //    C'est ce partage qui fait que le feu continue de brûler quand la lecture
  //    est terminée, sans qu'aucun état de la démonstration cesse d'être une
  //    fonction du temps.
  //
  //    En mouvement réduit, rien ne change ICI — la timeline pose la même
  //    valeur d'arrivée. C'est le CSS qui coupe le vacillement, parce que
  //    `prefers-reduced-motion` est une préférence de l'utilisateur qui peut
  //    basculer sans recompilation : un feu fixe, mais un feu.
  // La moitié de la fenêtre sert à échelonner les départs, l'autre à la montée
  // du dernier : le feu est entièrement pris quand l'étape s'achève.
  const ecart = brasiers.length > 1 ? (fenetre * 0.5) / (brasiers.length - 1) : 0;
  const montee = Math.max(1, ctx.reduced ? 1 : fenetre * 0.5);
  brasiers.forEach((bid, i) => {
    /* ★ L'ÉCHELONNEMENT EST LARGE, ET C'EST AUSSI UNE MESURE DE FLUIDITÉ.
       Chaque foyer coûte un tramage de filtre à sa naissance — cinq flous, à
       la taille du verdict. Dix foyers qui prendraient ensemble, ce sont dix
       tramages dans la même image. Espacés d'un vingtième de l'étape, ils se
       répartissent sur plus d'une demi-durée : le travail total ne change pas,
       il cesse de tomber d'un bloc.
       La variété y gagne aussi — un feu qui prend d'un seul coup partout,
       c'est le défaut « ils sont identiques » sous une autre forme. */
    const at = calme + i * (ctx.reduced ? 0 : ecart);
    ctx.anim({
      id: bid, prop: 'opacity', to: BRASIER.intensite,
      at, dur: montee, ease: EASE.fade,
    });
  });
}

/**
 * Découpe les chiffres révélés en séries de trois.
 *
 * Renvoie **une seule** série — donc « pas de découpage » — dès que la suite
 * n'est pas faite de séries entières, ou qu'il n'y en a qu'une. Un verdict de
 * quatre chiffres existe (les bancs d'essai en ont un) : y ouvrir un vide après
 * le troisième affirmerait un « 666 + 6 » que personne n'a démontré.
 */
function decouperEnSeries(ids, serie = SERIE) {
  if (ids.length <= serie || ids.length % serie !== 0) return [ids];
  const out = [];
  for (let i = 0; i < ids.length; i += serie) out.push(ids.slice(i, i + serie));
  return out;
}

/**
 * Écrit dans le flux l'état visé : largeur des jetons, écarts, coupure de rang.
 *
 * Tout passe par le LAYOUT — largeurs et écarts grandissent avec les glyphes,
 * et c'est le moteur de layout qui centre. Le geste reste donc idempotent : le
 * rejouer ne déplace rien, et une recompilation (`rebuild()` au
 * redimensionnement) repart des mêmes mesures nominales.
 */
function poserLeFlux(ctx, ids, series, { echelle, separation, rangs }) {
  const gap = ctx.layoutOpts.gap * echelle;
  const vide = separation ? videDeSerie(ctx) * echelle : gap;
  // Les coupures tombent entre deux séries, jamais dedans — c'est
  // `repartirEnLignes` qui dit lesquelles, et il n'y a pas d'autre source.
  const coupures = debutsDeRang(rangs);

  series.forEach((serie, s) => {
    serie.forEach((id, k) => {
      const n = ctx.scene.get(id);
      n.w = mesureNominale(ctx, id) * echelle;
      n.breakBefore = k === 0 && coupures.has(s);
      if (s === 0 && k === 0) n.gapBefore = undefined;
      else n.gapBefore = k === 0 ? vide : gap;
    });
  });

  if (ctx.scene.flowIndex(ids[0]) === 0) ctx.scene.get(ids[0]).gapBefore = 0;

  // `coupuresExplicites` n'ouvre PAS le repli automatique (`wrap`) : il rend
  // seulement effectives les coupures que la primitive a posées elle-même.
  // Une ligne qui déborde continue de défiler, elle ne se replie pas.
  ctx.layoutOpts.coupuresExplicites = rangs.length > 1;
  if (rangs.length > 1) {
    ctx.layoutOpts.lineHeight = hauteurDeCapitale(ctx) * echelle * INTERLIGNE;
  }
}

/**
 * Le facteur d'agrandissement : « qu'ils prennent l'essentiel de l'espace
 * d'affichage animé, tout en laissant un peu d'air autour ».
 *
 * Deux contraintes, la plus serrée gagne : la hauteur de capitale (ou, sur deux
 * rangs, la hauteur du bloc entier) ne dépasse pas sa part de la scène, et la
 * largeur du rang le plus long pas `AIR_HORIZONTAL` de la zone utile.
 *
 * ★ C'est presque toujours la LARGEUR qui borne, et c'est pour cela que le
 * second rang existe : sur cinq séries, passer de un à deux rangs fait monter
 * l'agrandissement de ×1,7 à ×2,9.
 */
function zoomDuVerdict(ctx, ids, series, rangs) {
  const lignes = rangs.length;
  const capitale = hauteurDeCapitale(ctx);
  const largeur = plusLongRang(ctx, series, rangs);
  // ★ POSER QUELQUE CHOSE AU-DESSUS DES CHIFFRES, C'EST LEUR PRENDRE DE LA
  // HAUTEUR. Les cornes du 666 dépassent l'ancre du jeton de bien plus que la
  // demi-capitale ; agrandir comme s'il n'y avait que des glyphes enverrait
  // leurs pointes hors du cadre (mesuré : ×8,5 sur un 666 seul met la pointe
  // 200 unités au-dessus du bord). Le verdict le paie donc en TAILLE, pas en
  // débordement — c'est la même règle que pour la largeur, appliquée en haut.
  const haut = Math.max(capitale / 2, debordDuDecor(ctx, ids));
  const hauteurNominale = haut + capitale / 2;
  const bloc = lignes > 1
    ? (ctx.layoutOpts.viewBox.h * AIR_VERTICAL_BLOC)
      / Math.max(1, hauteurNominale + capitale * (lignes - 1) * INTERLIGNE)
    : (ctx.layoutOpts.viewBox.h * AIR_VERTICAL) / Math.max(1, hauteurNominale);
  const parLaLargeur = (ctx.layoutOpts.maxWidth * AIR_HORIZONTAL) / Math.max(1, largeur);
  const z = Math.min(bloc, parLaLargeur, ZOOM_MAX);
  return Math.max(1, Math.round(z * 1000) / 1000);
}

/**
 * De combien le décor accroché aux chiffres dépasse vers le haut, en unités
 * NOMINALES (avant agrandissement) — 0 s'il n'y en a pas.
 *
 * La valeur est annoncée par la primitive qui a posé le décor (`data.debord`),
 * jamais recalculée ici : le verdict ne connaît pas le dessin des cornes, et il
 * n'a pas à le connaître — il lui suffit de savoir de combien il dépasse.
 */
function debordDuDecor(ctx, ids) {
  let d = 0;
  for (const id of ids) {
    for (const sid of ctx.scene.accrochesA(id)) {
      const n = ctx.scene.get(sid);
      const v = n && n.data ? Number(n.data.debord) : 0;
      if (Number.isFinite(v) && v > d) d = v;
    }
  }
  return d;
}

/** Largeur nominale du rang le plus long, séparations comprises. */
function plusLongRang(ctx, series, rangs) {
  const gap = ctx.layoutOpts.gap;
  const vide = series.length > 1 ? videDeSerie(ctx) : gap;
  const coupures = debutsDeRang(rangs);
  let max = 0;
  let courant = 0;
  series.forEach((serie, s) => {
    if (coupures.has(s)) { max = Math.max(max, courant); courant = 0; }
    if (courant > 0) courant += vide;
    serie.forEach((id, k) => {
      if (k > 0) courant += gap;
      courant += mesureNominale(ctx, id);
    });
  });
  return Math.max(max, courant);
}

function hauteurDeCapitale(ctx) {
  return ctx.metrics.capHeight || ctx.metrics.fontSize * 0.73;
}

/**
 * La largeur d'un jeton **avant** tout agrandissement.
 *
 * `reveal` peut être rejoué par une recompilation (`rebuild()` au
 * redimensionnement) : partir de `node.w` sans précaution reviendrait à
 * multiplier deux fois. On la redérive donc du texte et de la chasse.
 */
function mesureNominale(ctx, id) {
  const n = ctx.scene.get(id);
  const chars = typeof n.text === 'string' ? [...n.text].length : 0;
  return Math.max(chars, 1) * ctx.metrics.advance;
}
