/**
 * ★ LE PRINCIPE DU MIROIR — une demi-ellipse par élément, et la ligne pivote.
 *
 * ## Pourquoi ce module existe
 *
 * L'Atbash retourne un alphabet, `p.miroir` retourne un nombre. Ce ne sont pas
 * les mêmes objets — vingt-six cases de réglette d'un côté, trois chiffres de
 * la ligne de l'autre — mais **c'est le même geste**, et l'auteur l'a dit en
 * ces termes : « réutilise le principe de l'animation en ellipse, il devrait
 * être commun à tout type de miroir, même si ce n'est pas la même chose qu'on
 * met en miroir ».
 *
 * Tant qu'un geste est écrit deux fois, il diverge deux fois — c'est
 * exactement l'argument de `decor.js`, qui a réuni le clavier et la table. Le
 * calcul du miroir est donc écrit **ici, une fois**, et les deux gestes
 * l'appellent : `glissiere.js` pour la seconde réglette d'une glissière,
 * `move.js` pour la ligne elle-même.
 *
 * ## Le calcul, et ce qu'il garantit
 *
 * Chaque élément va de sa place de départ à sa place d'arrivée par une
 * **demi-ellipse** dont le grand axe est le segment qui les joint :
 *
 *   a  = (arrivée − départ) / 2          demi-grand axe, SIGNÉ
 *   cx = (arrivée + départ) / 2          le centre du trajet
 *   b  = a × APLATISSEMENT               demi-petit axe, signé lui aussi
 *
 *   x(θ) = cx − a·cos θ                  θ de 0 à π
 *   y(θ) = y₀ + b·sin θ
 *
 * ★ **Les demi-axes verticaux sont proportionnels aux horizontaux**, et c'est
 * toute la propriété : les éléments restent **alignés à chaque instant**, la
 * bande est une droite qui pivote autour de son milieu. Ce n'est pas un effet
 * décoratif, c'est ce qui fait lire le mouvement comme un objet qu'on
 * RETOURNE — et non comme n éléments qui se croisent chacun pour soi.
 *
 * ★ **`a` est signé**, donc `b` aussi : ce qui part à droite se creuse vers le
 * bas, ce qui part à gauche vers le haut. Les deux moitiés se croisent sans se
 * traverser.
 *
 * ★ **Tous les éléments se croisent au même instant, au même point** — leur
 * milieu commun est le milieu de la bande. À mi-parcours ils sont donc empilés
 * sur une même verticale : c'est de la géométrie, aucun réglage d'ellipse ne
 * l'évite. On les rétrécit à l'approche du croisement pour que la pile
 * s'éclaircisse, et on les rend à leur taille en arrivant. Le facteur suit le
 * sinus, comme la bosse : les deux disent la même chose du même mouvement.
 */

/** Points d'échantillonnage d'une ellipse — assez pour que l'arc soit un arc. */
export const ECHANTILLONS = 12;

/**
 * ★ L'aplatissement des ellipses du retournement.
 *
 * Un vrai demi-tour (demi-cercles) enverrait les éléments extrêmes à la moitié
 * de la largeur de la bande au-dessus et au-dessous d'elle : hors de la scène
 * pour un alphabet de vingt-six cases. On aplatit donc, et le facteur est
 * **borné par la hauteur utile** — au-delà, les cases sortiraient du cadre, or
 * la caméra ne recule qu'une fois, au déploiement, et pas pour une excursion
 * d'une demi-seconde.
 *
 * ★ Il est **le même pour tous les miroirs**, et c'est voulu : la bosse est
 * proportionnelle à la distance parcourue, donc un miroir de deux chiffres
 * s'arque peu et un miroir de vingt-six cases s'arque beaucoup. C'est exact —
 * ils ne parcourent pas la même distance — et c'est la seule règle qui n'ait
 * pas besoin de connaître ce qu'elle retourne.
 */
export const APLATISSEMENT = 0.22;

/**
 * ★ Ce que les éléments perdent en taille pendant le retournement — voir
 * l'en-tête : c'est ce qui éclaircit la pile de mi-parcours.
 */
export const RETRECISSEMENT = 0.55;

/**
 * La demi-ellipse d'un élément, de `depart` à `arrivee`.
 *
 * @param {{x:number,y:number}} depart
 * @param {{x:number,y:number}} arrivee — l'ordonnée d'arrivée fait la ligne de
 *   base ; un miroir ne change pas de ligne, les deux sont normalement égales
 * @param {{echantillons?:number, aplatissement?:number, retrecissement?:number}} [opts]
 * @returns {{trajet:{x:number,y:number}[], tailles:number[]}}
 *   `trajet` compte `echantillons + 1` points, départ et arrivée compris ;
 *   `tailles` porte le facteur d'échelle au même pas.
 */
export function demiEllipse(depart, arrivee, opts = {}) {
  const n = opts.echantillons || ECHANTILLONS;
  const plat = opts.aplatissement === undefined ? APLATISSEMENT : opts.aplatissement;
  const retr = opts.retrecissement === undefined ? RETRECISSEMENT : opts.retrecissement;
  const a = (arrivee.x - depart.x) / 2;
  const cx = (arrivee.x + depart.x) / 2;
  const b = a * plat;
  const trajet = [];
  const tailles = [];
  for (let k = 0; k <= n; k++) {
    const theta = (Math.PI * k) / n;
    trajet.push({ x: cx - a * Math.cos(theta), y: arrivee.y + b * Math.sin(theta) });
    tailles.push(1 - retr * Math.sin(theta));
  }
  return { trajet, tailles };
}
