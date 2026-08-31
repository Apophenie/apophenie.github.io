/**
 * Fabrique des éléments SVG et application des états.
 *
 * Règles non négociables appliquées ici (CONTRACTS §3.2) :
 *  3. **un canal, un élément** : `translate`, `rotate` et `scale` vivent chacun
 *     sur SON `<g>` de la chaîne de position (voir `enchainer`), sous forme de
 *     `transform`. Chaque step anime toujours son propre canal — c'est ce que la
 *     règle 3 protège — mais aucun canal ne partage plus une propriété avec un
 *     autre, donc aucun ne peut être écrasé ;
 *  4. une origine de transformation FIXE et commune à toute la chaîne d'un nœud
 *     (`transform-box: view-box` + un point du repère local) : sans quoi les
 *     trois maillons tourneraient et grossiraient chacun autour d'un point
 *     différent ;
 *  5. toutes les valeurs sont en unités viewBox (le suffixe `px` est obligatoire
 *     en CSS, mais l'unité reste celle du système de coordonnées utilisateur) ;
 *  9. **aucun `foreignObject`** : il rend le canvas *tainted* à l'export.
 *
 * On pose toutes les positions via `element.style`, jamais via l'attribut
 * `transform` : la propriété CSS gagne sur l'attribut, les mélanger produirait
 * des états contradictoires selon qu'une animation est active ou non (§5.3).
 */

import { FONT_FAMILY, PALETTE } from './constants.js';
import { glyphTransform } from './assets.js';
import { feuDe } from './primitives/feu.js';

export const SVGNS = 'http://www.w3.org/2000/svg';

/** Couches de la scène, du fond vers l'avant.
 *
 *  ★ `nuit` — la couche de l'ORAGE, sous tout le reste. Elle porte les deux
 *  aplats pleine scène de la scénographie du verdict : le fond lugubre et le
 *  flash de foudre. Ils doivent passer derrière ABSOLUMENT tout, y compris les
 *  décors de `back` (réglettes, claviers, halos) — un fond qui passerait devant
 *  un halo ne serait plus un fond. */
export const LAYERS = ['nuit', 'back', 'mid', 'front'];

const LAYER_OF = {
  camera: null, halo: 'back', keyboard: 'back', table: 'back', frame: 'back',
  // Une case de réglette MOBILE (la seconde bande d'une glissière, qui coulisse
  // ou se retourne au déploiement) : c'est du décor, comme la table dont elle
  // se détache — et elle doit rester DERRIÈRE les jetons qui la survolent.
  case: 'back',
  text: 'mid',
  glyph: 'front', seg: 'front', bracket: 'front', label: 'front', marker: 'front',
  // Les cornes se posent PAR-DESSUS les chiffres qu'elles couronnent : elles
  // dépassent du haut des glyphes et ne doivent jamais passer derrière eux.
  horns: 'front',
  // Le souffle du 6 surnuméraire qui explose au verdict
  // (`primitives/explosion.js`). Devant, comme les cornes, et pour la même
  // raison : ses éclats passent PAR-DESSUS les deux triptyques qu'ils écartent
  // — c'est ce recouvrement qui fait lire une poussée plutôt qu'un fondu.
  souffle: 'front',
  // L'orage. Le fond et l'éclair tapissent la scène entière ; l'embrasement,
  // lui, est un décor accroché à UN chiffre — il doit donc rester DERRIÈRE lui
  // (`back`), sinon un halo orange passerait par-dessus le 6 qu'il entoure et
  // le verdict deviendrait illisible à l'instant où il se lit.
  nuit: 'nuit', eclair: 'nuit', brasier: 'back',
};

export function layerOf(role) {
  return LAYER_OF[role] ?? 'front';
}

export function el(name, attrs = {}) {
  const e = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    e.setAttribute(k, String(v));
  }
  return e;
}

// ───────────────────── la chaîne de position (règle 3, amendée) ────────────
//
// ★ Le défaut que cette chaîne supprime, et pourquoi il ne se voyait que sous
// Firefox.
//
// Symptôme : pendant les steps qui font paraître un jeton neuf — la case
// résultat sous l'accolade, les chiffres de l'éclatement de « 15 » en « 1 » et
// « 5 » —, ce jeton était peint **en haut à gauche de la scène**, à l'origine du
// `viewBox`, au lieu de sa place. Sous Chromium, jamais.
//
// Ce qui rendait la chasse si difficile : côté moteur, TOUT est juste.
// `getComputedStyle(el).translate` rend la bonne valeur, `getBoundingClientRect()`
// rend le bon rectangle, et le filet « nœud sans position » (plus bas) ne se
// déclenche jamais. Le défaut n'existe qu'à la PEINTURE.
//
// Cause : quand Firefox promeut un élément en couche de composition — ce qu'une
// simple animation d'opacité suffit à déclencher —, la transformation qu'il
// confie au compositeur est construite **sans les propriétés individuelles**
// `translate` / `rotate` / `scale`. Le nœud est composé à l'identité : dans le
// coin. Deux preuves relevées sur la machine de l'auteur : (a) avec
// `layers.offmainthreadcomposition.async-animations = false` le défaut
// disparaît intégralement ; (b) un `transform` posé en doublon EST honoré par le
// compositeur — le nœud se déplace alors deux fois.
//
// ★ Ce qu'on a essayé d'abord, et pourquoi ça ne suffisait pas. Annoncer les
// canaux avec `will-change` avant de les animer. C'est une DEMANDE : rien
// n'oblige un moteur à composer comme on le lui suggère, et sur le bureau de
// l'auteur (WebRender, GPU) le défaut est resté. Une correction qui repose sur
// le bon vouloir du compositeur n'est pas une correction.
//
// ★ Le correctif : retirer la cause. Les propriétés individuelles ne sont plus
// employées NULLE PART. Chaque canal géométrique est un `transform` — la
// propriété que le compositeur honore, la preuve (b) ci-dessus — porté par son
// PROPRE élément :
//
//     <g class="nhl-pos">          translate     ← jamais d'opacité, jamais promu
//       <g class="nhl-rot">        rotate
//         <text/rect/path…>        scale, opacity, fill, texte…
//
// Deux conséquences, et ce sont les deux qui comptent :
//
//  · le nœud que Firefox promeut en couche (celui dont l'opacité est animée)
//    n'a plus AUCUNE position à perdre — il est à sa place parce que ses
//    ancêtres l'y mettent, et la transformation d'un ancêtre dans l'arbre de
//    couches n'est pas une faveur du compositeur, c'est le mécanisme de base de
//    toute page web ;
//  · la raison d'être de la règle 3 est intacte : deux steps qui animent l'un la
//    rotation, l'autre la position, ne se marchent toujours pas dessus, puisque
//    leurs `transform` sont sur deux éléments différents.
//
// L'ordre d'imbrication translate → rotate → scale reproduit exactement l'ordre
// dans lequel CSS applique les propriétés individuelles. Les primitives qui en
// dépendent (`keyboard` et `alphabet` recentrent la caméra en tenant compte du
// zoom) gardent donc leur arithmétique.
//
// ★ L'ORIGINE, et pourquoi la règle 4 devait changer avec la règle 3.
//
// Trois canaux sur un seul élément partageaient une seule origine — le centre
// de sa `fill-box`. Répartis sur trois éléments, chaque maillon a la sienne, et
// `fill-box` en donne trois DIFFÉRENTES : celle d'une enveloppe est la boîte de
// ce qu'elle contient, donc déjà mis à l'échelle. Mesuré sous Firefox 154 :
// dès que rotation ET échelle sont toutes deux actives, la chaîne « fill-box »
// s'écarte de l'ancienne composition de plusieurs dizaines d'unités viewBox.
// C'est la même famille d'erreur que celle qu'on corrige — un résultat qui
// dépend de la façon dont le moteur choisit une boîte.
//
// L'origine est donc un POINT FIXE du repère local, le même sur tous les
// maillons : `transform-box: view-box; transform-origin: 0 0` désigne l'origine
// locale du nœud. La composition redevient une simple associativité de
// matrices — T · R · S, chacune autour du même point —, exacte par
// construction, dans n'importe quel moteur. Mesuré : écart 0,000000 sous
// Firefox 154 comme sous Chromium, sur rotation, échelle et les deux ensemble.
//
// Ce point (0,0) n'est pas un pis-aller : c'est l'ANCRE DE MISE EN PAGE du
// nœud, celle que `layout.js` positionne. Tous les contenus sont dessinés
// autour d'elle — `<text>` centré (`text-anchor: middle`, `dominant-baseline:
// central`), halo et cadre en `-w/2, -h/2`, marqueur en `cx=cy=0`, glyphe
// recentré par `glyphTransform`. Tourner ou grossir un jeton autour de son
// ancre est ce qu'on veut dire ; le faire autour du centre de son encre était
// une approximation, qui en prime se déplaçait quand le canal discret changeait
// le texte du nœud. Coût mesuré du changement : NUL sur les démonstrations
// passées au banc — en JetBrains Mono, `text-anchor: middle` +
// `dominant-baseline: central` mettent déjà le centre de la boîte du texte
// exactement sur (0,0). Il ne deviendrait sensible (~2 unités viewBox sur un
// demi-tour) qu'avec une police de repli aux chasses dissymétriques.
//
// La caméra fait exception, et pour la même raison qu'avant : son origine est
// le centre du `viewBox` (règle 6), car un recul de caméra doit reculer autour
// du centre de la scène.

/** Origine des transformations d'un jeton : son ancre de mise en page. */
const ORIGINE_TOKEN = '0px 0px';

/** Origine des transformations de la caméra : le centre du `viewBox`. */
export const ORIGINE_CAMERA = 'center';

const chaines = new WeakMap();   // élément racine → { translate, rotate, content }

/**
 * Enveloppe un contenu dans sa chaîne de position et enregistre la chaîne.
 *
 * @param {Element} contenu   l'élément qui dessine (texte, rect, path, g…)
 * @param {{origine?:string}} [opt]  `ORIGINE_CAMERA` pour la caméra (règle 6)
 * @returns {{racine:Element, translate:Element, rotate:Element, content:Element}}
 */
export function enchainer(contenu, opt = {}) {
  // Règle 4, amendée : l'origine des transformations est un POINT FIXE du
  // repère local, pas le centre d'une boîte englobante. Voir ci-dessus.
  const origine = opt.origine || ORIGINE_TOKEN;
  const gT = el('g', { class: 'nhl-pos' });
  const gR = el('g', { class: 'nhl-rot' });
  gT.appendChild(gR);
  gR.appendChild(contenu);

  for (const e of [gR, contenu]) {
    e.style.transformBox = 'view-box';
    e.style.transformOrigin = origine;
  }
  // L'enveloppe de position n'a pas d'origine à choisir : une translation ne
  // dépend d'aucun point de référence. On ne lui en donne donc pas.
  gT.style.pointerEvents = 'none';

  const chaine = { racine: gT, translate: gT, rotate: gR, content: contenu };
  chaines.set(gT, chaine);
  return chaine;
}

/**
 * L'élément qui PORTE un canal donné, dans la chaîne d'un nœud.
 *
 * Appelé avec un élément qui n'est pas une racine de chaîne (un élément de
 * test, un nœud construit à la main), il rend cet élément : la fonction est
 * une projection, pas une exigence de structure.
 */
export function porteurDe(element, prop) {
  const c = element ? chaines.get(element) : null;
  if (!c) return element;
  if (prop === 'translate') return c.translate;
  if (prop === 'rotate') return c.rotate;
  return c.content;
}

/** L'élément qui dessine, sous la chaîne de position. */
export function contenuDe(element) {
  const c = element ? chaines.get(element) : null;
  return c ? c.content : element;
}

/**
 * Crée l'élément d'un nœud de scène.
 *
 * ★ Rend la **racine de la chaîne de position**, pas l'élément qui dessine :
 * c'est elle qu'on insère dans une couche, elle qu'on retrouve par
 * `elements.get(id)`, et `porteurDe` route chaque canal vers le bon maillon.
 *
 * @param {object} node
 * @param {{metrics:object, palette:object}} env
 */
export function createElementFor(node, env) {
  const { metrics, palette = PALETTE } = env;
  const fs = metrics.fontSize;
  let element;

  switch (node.role) {
    case 'text': {
      element = el('text', {
        x: 0, y: 0,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-family': FONT_FAMILY,
        'font-size': fs,
        'font-variant-numeric': 'tabular-nums',
        class: `nhl-token nhl-kind-${node.kind || 'letter'}`,
      });
      element.textContent = node.text;
      break;
    }
    case 'label': {
      const s = (node.data && node.data.scale) || 0.55;
      element = el('text', {
        x: 0, y: 0,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-family': FONT_FAMILY,
        'font-size': Math.round(fs * s * 100) / 100,
        'letter-spacing': '0.04em',
        class: 'nhl-label',
      });
      element.textContent = node.text;
      break;
    }
    case 'halo': {
      const h = (node.data && node.data.h) || fs * 1.16;
      element = el('rect', {
        x: -node.w / 2, y: -h / 2, width: node.w, height: h,
        rx: (node.data && node.data.rx) || 2,
        class: 'nhl-halo',
      });
      break;
    }
    case 'bracket': {
      element = el('path', {
        d: node.data.d,
        fill: 'none',
        'stroke-width': 2,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        pathLength: 100,
        'stroke-dasharray': 100,
        class: 'nhl-bracket',
      });
      break;
    }
    case 'glyph':
    case 'seg': {
      // Le tracé vit dans le repère glyphe (0..400 × 0..600, origine en bas à
      // gauche) : un `<g>` interne porte la transformation **statique** de mise
      // à l'échelle et de retournement de l'axe y. Elle n'est jamais animée.
      // `data.scale` agrandit le glyphe SANS toucher au canal `scale` du nœud :
      // l'encart de démonstration montre la lettre en grand, et la primitive
      // garde `scale` libre pour ses propres accents.
      // `data.width` : l'épaisseur du trait, quand l'afficheur en demande une
      // autre que celle du sept segments. Le quatorze segments loge deux fois
      // plus de barres dans le même cadre — au trait de 56, son moyeu se
      // referme sur lui-même (`SEG14_STROKE`, `assets.js`).
      // `data.plein` : le tracé est un CONTOUR FERMÉ, pas un axe — c'est le
      // segment tel que la police le dessine (`assets.js`, bloc « dseg »). Il
      // porte son épaisseur dans sa forme, s'allume par son `fill` et n'a
      // aucune raison d'être arrondi ni épaissi : lui poser un trait le
      // ferait déborder sur ses voisins, c'est-à-dire défaire exactement ce
      // que le comptage individuel demande.
      const zoom = (node.data && node.data.scale) || 1;
      const plein = !!(node.data && node.data.plein);
      const epaisseur = (node.data && node.data.width)
        || (node.role === 'seg' ? 56 : 46);
      const wrap = el('g');
      const inner = el('g', { transform: glyphTransform(fs * zoom).transform });
      inner.appendChild(el('path', plein ? {
        d: node.data.d,
        stroke: 'none',
        'fill-rule': 'nonzero',
        class: node.role === 'seg' ? 'nhl-seg' : 'nhl-glyph',
      } : {
        d: node.data.d,
        fill: 'none',
        'stroke-width': epaisseur,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        pathLength: 100,
        'stroke-dasharray': 100,
        'vector-effect': 'none',
        class: node.role === 'seg' ? 'nhl-seg' : 'nhl-glyph',
      }));
      wrap.appendChild(inner);
      element = wrap;
      break;
    }
    case 'frame': {
      // L'encart : le cadre dans lequel la lettre est montrée en grand,
      // changée de police, comptée. Un rectangle, rien de plus — c'est le
      // contenu qui parle.
      const h = (node.data && node.data.h) || fs * 2;
      element = el('rect', {
        x: -node.w / 2, y: -h / 2, width: node.w, height: h,
        rx: (node.data && node.data.rx) || 6,
        fill: (node.data && node.data.fill) || 'none',
        'stroke-width': 1.5,
        class: 'nhl-frame',
      });
      break;
    }
    case 'table': {
      element = buildTable(node, fs, palette);
      break;
    }
    case 'case': {
      // Une case de réglette, seule : le même rectangle et la même étiquette
      // que dans la table (`buildTable`), mais portée par son propre nœud parce
      // qu'elle doit pouvoir se déplacer sans la table (`primitives/
      // glissiere.js`). Le dessin est ici volontairement le jumeau de celui des
      // cases fixes : une bande qui ne ressemblerait pas à la réglette dont
      // elle est la moitié ne se lirait pas comme sa moitié.
      const h = (node.data && node.data.h) || fs;
      const g = el('g');
      g.appendChild(el('rect', {
        x: -node.w / 2, y: -h / 2, width: node.w, height: h,
        rx: (node.data && node.data.rx) || 4,
        fill: palette.raised, stroke: palette.line, 'stroke-width': 1,
      }));
      g.appendChild(keyLabel(
        node.data.texte, 0, 0, node.data.taille || fs * 0.46,
        palette[node.data.tone] || palette.fg,
      ));
      element = g;
      break;
    }
    case 'nuit':
    case 'eclair': {
      // ★ L'ORAGE — deux aplats pleine scène, l'un sombre, l'autre clair.
      //
      // Ils sont volontairement TRÈS plus grands que le `viewBox` (`data.w`,
      // `data.h`, posés par la primitive à trois fois ses dimensions) et
      // centrés sur son centre. Raison : la couche vit à l'intérieur de
      // `@pan`, donc à l'intérieur de `@camera`. Le verdict ne bouge ni l'un
      // ni l'autre, mais un panoramique résiduel ou un recul de caméra
      // découvrirait un bord du fond, et l'on verrait la page apparaître au
      // milieu de la nuit. Trois fois la scène rend ce défaut impossible sans
      // rien coûter : un rectangle uni ne se paie pas au pixel.
      //
      // ★ Aucun `stroke`, aucune transformation propre — seule l'OPACITÉ est
      // animée, et elle l'est sur le maillon de contenu de la chaîne de
      // position (CONTRACTS §3.2, règles 3 et 4). C'est très exactement la
      // recette du défaut Firefox si on la posait ailleurs.
      element = el('rect', {
        x: -node.data.w / 2, y: -node.data.h / 2,
        width: node.data.w, height: node.data.h,
        class: node.role === 'nuit' ? 'nhl-nuit' : 'nhl-eclair',
      });
      break;
    }
    case 'brasier': {
      element = construireBrasier(node, palette, metrics);
      break;
    }
    case 'horns': {
      // Les deux cornes en UN seul tracé (deux sous-chemins fermés), rempli :
      // une corne porte son épaisseur dans sa forme — elle est large au pied et
      // fine à la pointe —, ce qu'un trait d'épaisseur constante ne sait pas
      // dire. Le repère est celui de la scène, centré sur l'ancre du nœud, donc
      // aucune mise à l'échelle statique n'est nécessaire : le canal `scale`
      // reste libre pour la pousse, puis pour l'agrandissement du verdict.
      element = el('path', {
        d: node.data.d,
        stroke: 'none',
        'fill-rule': 'nonzero',
        class: 'nhl-horns',
      });
      break;
    }
    case 'souffle': {
      // Les neuf éclats en UN seul tracé (neuf sous-chemins fermés), rempli —
      // même parti que les cornes, et pour la même raison : un éclat porte son
      // épaisseur dans sa forme, large au pied et pointu au bout, ce qu'un
      // trait d'épaisseur constante ne sait pas dire. Le repère est celui de la
      // scène, centré sur la place qu'occupait le 6 : aucune mise à l'échelle
      // statique, et le canal `d` reste seul à décrire le geste
      // (`primitives/explosion.js › souffleD`).
      element = el('path', {
        d: node.data.d,
        stroke: 'none',
        'fill-rule': 'nonzero',
        class: 'nhl-souffle',
      });
      break;
    }
    case 'marker': {
      element = el('circle', { cx: 0, cy: 0, r: (node.data && node.data.r) || 6, class: 'nhl-marker' });
      break;
    }
    case 'keyboard': {
      element = buildKeyboard(node, fs, palette);
      break;
    }
    default:
      element = el('g');
  }

  const racine = enchainer(element).racine;
  racine.setAttribute('data-nhl-id', node.id);
  return racine;
}

/**
 * ★ L'EMBRASEMENT — LE CHIFFRE LUI-MÊME EN FEU.
 *
 * Le POURQUOI est dans `primitives/feu.js` (pur, testable sans navigateur) et
 * la provenance dans `.planning/inspirations/feu/`. Ce qui suit n'explique que
 * la STRUCTURE.
 *
 * ```
 * <g>                                        ← contenu du nœud : WAAPI y anime
 *   <text class="nhl-feu" style="--a,--b">     `opacity` (l'allumage, fonction
 *   <path class="nhl-feu" style="--a,--b">     du temps) et `scale` (la
 * </g>                                         solidarité du décor accroché)
 * ```
 *
 * Deux éléments, pas un de plus : la copie du chiffre, et celle de sa corne
 * s'il y en a une. Tout le feu tient dans leur `filter`.
 *
 * ★ **Le corps est rempli de NUIT.** C'est le tour de main d'atnyman — sa lettre
 * est noire sur fond noir, et l'on ne voit d'elle que ses ombres. La copie est
 * donc invisible, et seuls ses halos brûlent. Le vrai chiffre, en rubrique, est
 * peint par-dessus dans sa couche.
 *
 * ★ **Et c'est ce qui rend le verdict lisible par construction** :
 * `drop-shadow()` peint derrière l'élément qui la porte, donc la copie couleur
 * de nuit couvre exactement l'empreinte du glyphe et le vrai chiffre repose sur
 * du fond pur — ses 7,4:1, partout, sans dérogation. Les deux tentatives
 * précédentes devaient acheter leur lisibilité ; celle-ci n'en paie rien.
 *
 * ★ **La corne brûle avec son 6, dans le MÊME nœud.** Elle est déjà accrochée à
 * lui (`data.suit`) : les deux corps partagent le repère, l'échelle et
 * l'instant de naissance sans une ligne d'arithmétique. On relit son `d` — rien
 * d'autre. Le nœud des cornes n'est ni déplacé, ni redessiné : le calage dérivé
 * de la police et vérifié en CI est intact.
 *
 * ★ **Le mouvement est en CSS, pas dans la timeline.** Le vacillement d'une
 * flamme n'est pas un ÉTAT de la démonstration : aucune valeur, aucun rang,
 * aucun compte n'en dépend, et Le Registre n'a rien à en dire (même argument
 * que celui qui garde l'orage hors du vocabulaire, §3.1). N'étant pas fonction
 * du temps de la timeline, il n'a aucune raison de s'arrêter avec elle — et il
 * ne s'arrête pas, ce que l'auteur demande. Ce qui reste fonction du temps,
 * c'est la PRÉSENCE du feu : l'`opacity` du nœud, que `seek()` en arrière
 * ramène à zéro. Et rien ne tourne dans le vide : les animations sont `paused`
 * par défaut, `data-embrasement` (posé par `player.js`) les met en marche.
 */
function construireBrasier(node, palette = PALETTE, metrics) {
  const d = node.data;
  const fs = d.fontSize || (metrics && metrics.fontSize) || 48;
  // La couleur du corps : invisible sur la nuit, et c'est tout son rôle.
  const nuit = palette.nuit || d.couleur;
  const wrap = el('g');

  const corps = [
    { part: '', dessine: () => glypheDeFeu(d, fs) },
  ];
  if (d.corne) {
    corps.push({ part: 'corne', dessine: () => el('path', { d: d.corne, 'fill-rule': 'nonzero' }) });
  }

  for (const c of corps) {
    const f = feuDe({ fontSize: fs, id: node.id, part: c.part, palette,
      echelle: d.echelle || 1 });

    /* ★ LE FILTRE NE PORTE PLUS RIEN D'ANIMÉ — ET C'EST UN CORRECTIF, PAS UN
       RAFFINEMENT.

       « L'animation du feu est très bien, mais elle semble entraver la fluidité
       […] j'ai des freezes ou micro-saccades sur l'étape verdict, ou les
       flammes qui mettent près d'une minute avant de finalement apparaître »
       (l'auteur). Mesuré : à l'arrêt sur le verdict, une expression d'UNE LIGNE
       évaluée dans la page dépassait quinze secondes. Le fil principal était
       saturé.

       La cause n'était pas le filtre, qui est statique et se trame une fois :
       c'était l'`opacity` animée POSÉE SUR L'ÉLÉMENT QUI LE PORTE. Un filtre
       s'applique avant l'opacité ; les deux sur le même élément forcent le
       moteur à repasser les cinq flous à chaque image — dix corps, cinquante
       passes de flou par image, à l'échelle huit du verdict.

       Le remède est structurel et tient en un `<g>` : l'opacité va sur une
       ENVELOPPE, le filtre reste sur l'élément à l'intérieur. La couche filtrée
       est tramée une fois et mise en cache ; l'enveloppe ne fait plus varier
       qu'un canal de composition.

       ⚠ C'est la même famille de défaut que la règle « jamais d'opacité animée
       sur un élément portant une transformation individuelle » que ce projet
       applique déjà pour Firefox (`tests/compositeur.test.js`). La règle est
       désormais étendue au `filter`, et un test l'exige (`tests/feu.test.js`).

       ★ TROIS CORPS, ET AUCUN NE BOUGE JAMAIS.

       C'est le second correctif, et il découle du premier. « La dernière
       version fait apparaître en dessous des lettres leur clone enflammé
       miniature puis les fait grossir. On n'est pas censé voir la plomberie
       interne ! » (l'auteur). La germination était un `transform: scale()` sur
       l'enveloppe — mais rétrécir le corps rétrécit la SILHOUETTE qui projette
       les flammes, et l'on voyait donc un petit chiffre en feu à côté du grand.

       Les corps restent désormais à leur taille, exactement superposés au vrai
       chiffre, et ce sont les FLAMMES qui grandissent : trois chaînes statiques
       — la graine, l'adulte, la reprise —, entre lesquelles on ne fait varier
       que des opacités d'enveloppes.

         · `germe`   : la graine, courte. Opacité 1 → 0 pendant la pousse.
         · `eclos`   : l'état A, plein. Opacité 0 → 1 pendant la pousse.
         · `souffle` : l'état B, qui respire — mais seulement une fois la
                       pousse finie (`--nhl-feu-depart`).

       Le fondu croisé graine→adulte se lit comme une flamme qui monte, sans
       qu'aucune géométrie ne bouge : il n'y a donc plus rien à voir de
       l'échafaudage. */
    /* ★ CHAQUE CORPS PORTE SES DEUX PILES, et démarre sur la SOBRE.
       Le régisseur (`src/visuel/qualite.js`) bascule de l'une à l'autre en
       écrivant un `filter` ; les deux chaînes étant déjà calculées, il n'a rien
       à faire d'autre que choisir. Et l'on part sobre : les premières images
       sont donc bon marché sur toutes les machines, ce qui est exactement ce
       qui manquait à Firefox — « près d'une minute entre la fin du
       grossissement et l'allumage » (l'auteur). */
    const enveloppe = (classe, cle, style = '') => {
      const corpsFiltre = c.dessine();
      corpsFiltre.setAttribute('class', 'nhl-feu');
      corpsFiltre.setAttribute('fill', nuit);
      corpsFiltre.setAttribute('data-feu-riche', f.riche[cle]);
      corpsFiltre.setAttribute('data-feu-sobre', f.sobre[cle]);
      corpsFiltre.setAttribute('style', `filter:${f.sobre[cle]}`);
      const g = el('g', { class: classe });
      if (style) g.setAttribute('style', style);
      g.appendChild(corpsFiltre);
      wrap.appendChild(g);
      return g;
    };

    const cadence = `--nhl-feu-pousse:${f.pousse}ms;--nhl-feu-semis:${f.semis}ms`;
    enveloppe('nhl-feu-germe', 'graine', cadence);
    enveloppe('nhl-feu-eclos', 'a', cadence);
    enveloppe('nhl-feu-souffle', 'b',
      `${cadence};--nhl-feu-periode:${f.periode}ms;--nhl-feu-retard:${f.retard}ms`);

    /* ★ LE SCEAU — une copie NON FILTRÉE, en couleur de nuit, toujours opaque.
       Elle n'est pas un doublon : c'est elle, désormais, qui garantit que le
       vrai chiffre repose sur du fond pur. Sans elle, les enveloppes qui
       germent et qui respirent laisseraient, le temps de leur mouvement, un
       trou par lequel les halos remonteraient sous le glyphe — et le contraste
       du verdict avec (`primitives/feu.js`, `contrasteDuVerdict`).
       Elle coûte un tracé sans filtre, c'est-à-dire à peu près rien. */
    const sceau = c.dessine();
    sceau.setAttribute('class', 'nhl-feu-sceau');
    sceau.setAttribute('fill', nuit);
    wrap.appendChild(sceau);
  }

  return wrap;
}

/**
 * La copie du glyphe qui brûle.
 *
 * ★ Le texte est un INSTANTANÉ, pris à la création du nœud (`reveal.js`), et
 * non une lecture du canal discret. C'est licite ici et nulle part ailleurs :
 * le feu ne naît qu'au verdict, où plus rien ne transforme les chiffres — ils
 * ne font que grossir.
 *
 * Mêmes attributs de dessin que le rôle `text` : même police, même ancrage,
 * même ligne de base. Une copie qui ne serait pas rigoureusement superposable
 * au glyphe laisserait voir un liseré de nuit à côté du chiffre.
 */
function glypheDeFeu(data, fs) {
  const t = el('text', {
    x: 0, y: 0,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': FONT_FAMILY,
    'font-size': fs,
    'font-variant-numeric': 'tabular-nums',
  });
  t.textContent = data.texte || '';
  return t;
}

/**
 * Dessine le clavier : quatre rangées (ou les trois rangées de lettres seules),
 * plus les repères de la mesure demandée.
 *
 *  - `mesure: 'colonne'` → une **réglette numérotée de 1 à 10** au-dessus du
 *    clavier. Elle est indispensable : le `p` est en colonne 10 alors que la
 *    touche du dessus porte `0`. C'est l'index de colonne qui compte, pas le
 *    label de la touche du dessus.
 *  - `mesure: 'rangee'` → les trois rangées de lettres numérotées en marge, et
 *    la rangée de chiffres **absente** (la montrer laisserait croire qu'elle
 *    compte comme une rangée de plus).
 */
function buildKeyboard(node, fs, palette) {
  const g = el('g', { class: 'nhl-keyboard' });
  const geo = node.data.geo;
  const mesure = node.data.mesure || 'touche';

  for (const k of geo.keys) {
    g.appendChild(el('rect', {
      x: k.x, y: k.y, width: k.w, height: k.h, rx: 4,
      fill: palette.raised, stroke: palette.line, 'stroke-width': 1,
    }));
    if (k.rangee === 0) {
      // Rangée de chiffres : le chiffre (avec Maj) en haut, la frappe directe
      // en bas. C'est littéralement ce qu'on lit sur une touche.
      const haut = k.shift === null ? k.digit : k.shift;
      const bas = k.shift === null ? k.char : k.digit;
      g.appendChild(keyLabel(haut, k.cx, k.cy - k.h * 0.16, fs * 0.42, palette.fg3));
      g.appendChild(keyLabel(bas, k.cx, k.cy + k.h * 0.2, fs * 0.5, palette.fg));
    } else {
      g.appendChild(keyLabel(k.char.toUpperCase(), k.cx, k.cy, fs * 0.5, palette.fg));
    }
  }

  if (mesure === 'colonne') {
    for (const t of geo.ruler) {
      g.appendChild(keyLabel(String(t.n), t.cx, t.cy, fs * 0.38, palette.gold));
    }
    const y = geo.ruler[0].cy + fs * 0.26;
    g.appendChild(el('path', {
      d: `M ${round(-geo.width / 2)} ${round(y)} L ${round(geo.width / 2)} ${round(y)}`,
      fill: 'none', stroke: palette.gold, 'stroke-width': 1, opacity: 0.4,
    }));
  }
  if (mesure === 'rangee') {
    for (const t of geo.rowLabels) {
      g.appendChild(keyLabel(String(t.n), t.cx, t.cy, fs * 0.44, palette.gold));
    }
  }
  return g;
}

/**
 * Dessine une **table de correspondance** — réglette, grille ou pavé.
 *
 * Rien n'est décidé ici : `tableGeometry` (`assets.js`) a déjà posé chaque
 * case et chaque étiquette, y compris de quelle taille et de quelle couleur.
 * Le dessin ne fait que suivre, ce qui garantit que la case allumée par la
 * primitive et le texte lu par le spectateur sont au même endroit.
 *
 * ★ Les cases VIDES existent : sur le pavé téléphonique, la touche `1` ne
 * porte aucune lettre. L'effacer ferait de la grille autre chose qu'un
 * téléphone — on la dessine, en retrait.
 */
function buildTable(node, fs, palette) {
  const g = el('g', { class: 'nhl-table' });
  const geo = node.data.geo;
  const TONES = { fg: palette.fg, fg3: palette.fg3, gold: palette.gold };
  for (const c of geo.cells) {
    // ★ La seconde bande d'une glissière est dessinée AILLEURS — case par case,
    //   sur des nœuds mobiles (`primitives/glissiere.js`). La dessiner ici
    //   aussi la ferait voir deux fois : une immobile, une qui coulisse.
    if (node.data.bandeSeparee && c.ligne === 1) continue;
    g.appendChild(el('rect', {
      x: c.x, y: c.y, width: c.w, height: c.h, rx: 4,
      fill: fondDeCase(c, palette), stroke: palette.line, 'stroke-width': 1,
      opacity: c.vide ? 0.35 : 1,
    }));
    for (const l of c.labels) {
      g.appendChild(keyLabel(l.text, l.cx, l.cy, l.size, TONES[l.tone] || palette.fg));
    }
  }
  // ★ LA QUOTATION — le barème d'une table des restes, écrit une fois par
  //   colonne, au-dessus de la grille. Le dessin est celui de la réglette de
  //   colonnes du clavier AZERTY, au trait près : c'est le même objet, et
  //   l'auteur l'a demandé comme tel — « la quotation en fixe comme pour les
  //   azerty colonne ». Deux réglettes qui ne se ressembleraient pas ne se
  //   liraient pas comme la même chose.
  if (Array.isArray(geo.quotation) && geo.quotation.length) {
    for (const t of geo.quotation) {
      g.appendChild(keyLabel(String(t.n), t.cx, t.cy, fs * 0.38, palette.gold));
    }
    const y = geo.quotation[0].cy + fs * 0.26;
    g.appendChild(el('path', {
      d: `M ${round(-geo.width / 2)} ${round(y)} L ${round(geo.width / 2)} ${round(y)}`,
      fill: 'none', stroke: palette.gold, 'stroke-width': 1, opacity: 0.4,
    }));
  }
  return g;
}

/**
 * ★ Amplitude maximale de la teinte de fond — la part de `--line-ui` mêlée au
 * fond de case pour la valeur la plus forte.
 *
 * Elle est **plafonnée par le contraste**, pas par le goût. `--raised` et
 * `--line-ui` sont les deux bornes utiles de la charte (§2.3) : en thème clair
 * `--line-ui` est plus sombre que le fond, en thème sombre il est plus clair.
 * La direction demandée — « plus foncé en clair, l'inverse en sombre » — est
 * donc portée par les JETONS EUX-MÊMES, sans que le dessin ait à deviner le
 * thème. À 0,25, le pire couple texte/fond mesure **5,05:1** (le nombre en or
 * sur la case la plus teintée, thème clair) et **6,07:1** en thème sombre :
 * au-dessus du 4,5:1 exigé par design §5.1, avec la marge nécessaire au halo
 * doré qui passe par-dessus. Chaque palier reste distinct (ΔL* ≈ 2).
 */
const TEINTE_MAX = 0.25;

/**
 * Fond d'une case : le fond nominal, éclairci ou assombri selon sa valeur.
 *
 * Exporté pour être MESURÉ : un test calcule le contraste réel de chaque
 * palier contre le texte de la case, dans les deux thèmes, et refuse une
 * teinte qui descendrait sous le 4,5:1 de design §5.1.
 */
export function fondDeCase(cell, palette) {
  const t = cell.teinte;
  if (!t) return palette.raised;
  const fond = rvbDe(palette.raised);
  const vers = rvbDe(palette.lineUi || palette.line);
  if (!fond || !vers) return palette.raised;
  const k = t * TEINTE_MAX;
  const m = fond.map((v, i) => Math.round(v + (vers[i] - v) * k));
  return `#${m.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}

/** Une couleur de la palette en canaux 0–255 — `#abc`, `#aabbcc`, `rgb(…)`. */
function rvbDe(couleur) {
  const c = String(couleur || '').trim();
  const court = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c);
  if (court) return [1, 2, 3].map((i) => parseInt(court[i] + court[i], 16));
  const long = /^#([0-9a-f]{6})$/i.exec(c);
  if (long) return [0, 2, 4].map((i) => parseInt(long[1].slice(i, i + 2), 16));
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(c);
  if (rgb) {
    const n = rgb[1].split(/[,/\s]+/).filter(Boolean).slice(0, 3).map(Number);
    if (n.length === 3 && n.every(Number.isFinite)) return n.map((v) => Math.round(v));
  }
  return null;
}

function keyLabel(text, x, y, size, fill) {
  const t = el('text', {
    x, y,
    'text-anchor': 'middle', 'dominant-baseline': 'central',
    'font-family': FONT_FAMILY, 'font-size': Math.round(size * 100) / 100,
    fill,
  });
  t.textContent = text;
  return t;
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}

/**
 * Sérialise une valeur de canal pour CSS / WAAPI.
 *
 * ★ Les trois canaux géométriques sortent en **fonctions de `transform`**, pas
 * en propriétés individuelles : chacun est seul sur son maillon de la chaîne
 * (voir `enchainer`), donc `transform` ne compose jamais deux canaux.
 */
export function formatValue(prop, v) {
  switch (prop) {
    case 'translate':
      return `translate(${num(v.x)}px, ${num(v.y)}px)`;
    case 'rotate':
      return `rotate(${num(v)}deg)`;
    case 'scale':
      return `scale(${num(v)})`;
    case 'r':
      return `${num(v)}px`;
    case 'opacity':
    case 'strokeDashoffset':
      return String(num(v));
    default:
      return String(v);
  }
}

/**
 * Nom CSS d'un canal — pour `element.style` comme pour une keyframe WAAPI.
 * Les trois canaux géométriques s'écrivent tous dans `transform`, chacun sur
 * son propre élément.
 */
const CSS_NAME = {
  translate: 'transform',
  rotate: 'transform',
  scale: 'transform',
  opacity: 'opacity',
  fill: 'fill',
  stroke: 'stroke',
  strokeDashoffset: 'strokeDashoffset',
  r: 'r',
};

/** @returns {string|null} nom de la propriété CSS animée par ce canal. */
export function nomCss(prop) {
  return CSS_NAME[prop] || null;
}

// ───────────────────── dernier recours : jamais peint dans le coin ─────────
//
// ★ Le compilateur refuse déjà un nœud sans position, ou dont une coordonnée
// n'est pas un nombre (voir la garde en fin de `compile.js`). Ce qui suit est le
// filet SOUS cette garde, pour l'instant qu'elle ne couvre pas : la LECTURE.
//
// Deux chemins mènent au coin supérieur gauche de la scène, et tous deux sont
// silencieux :
//
//  1. `applyBase` retombait sur « translate: 0 0 » quand `base.translate`
//     manquait ;
//  2. `formatValue` passe par `num()`, qui rend 0 pour tout ce qui n'est pas
//     fini : une seule coordonnée devenue `NaN` en cours de route colle le nœud
//     à l'origine — AVEC SON TEXTE, sans la moindre erreur pour le trahir.
//
// La règle est désormais : **mieux vaut un élément manquant qu'un chiffre faux
// au milieu d'une démonstration qui prétend prouver quelque chose.** Un nœud
// dont la position n'est pas utilisable est retiré de la vue (`visibility`,
// qui n'est animée par personne) et l'anomalie est écrite en console, une fois
// par couple (nœud, canal) — une boucle rAF ne doit pas noyer la console.
//
// Le masque est RÉVERSIBLE : dès qu'une valeur utilisable arrive sur le même
// canal, le nœud réapparaît. Un `seek()` en arrière reste donc exact.

const ATTR_SANS_POSITION = 'data-nhl-sans-position';
const masques = new WeakMap();   // element → Set des canaux fautifs
const dejaSignale = new Set();   // `${id}::${prop}` déjà écrits en console

/** Une valeur est-elle utilisable pour un canal géométrique ? */
export function valeurUtilisable(prop, v) {
  switch (prop) {
    case 'translate':
      return !!v && Number.isFinite(Number(v.x)) && Number.isFinite(Number(v.y));
    case 'rotate':
    case 'scale':
    case 'r':
      return Number.isFinite(Number(v));
    default:
      return true;
  }
}

/** Le nœud est-il actuellement retiré de la vue faute de position ? */
export function sansPosition(element) {
  const s = masques.get(element);
  return !!(s && s.size);
}

/**
 * Retire un nœud de la vue plutôt que de le peindre à l'origine, et le dit.
 * @param {Element} element
 * @param {string} prop     canal fautif
 * @param {*} value         ce qui a été reçu
 */
export function masquerSansPosition(element, prop, value) {
  let s = masques.get(element);
  if (!s) { s = new Set(); masques.set(element, s); }
  s.add(prop);
  element.style.visibility = 'hidden';
  if (element.setAttribute) element.setAttribute(ATTR_SANS_POSITION, [...s].join(' '));

  const id = element.getAttribute ? element.getAttribute('data-nhl-id') : null;
  const cle = `${id}::${prop}`;
  if (dejaSignale.has(cle)) return;
  dejaSignale.add(cle);
  console.error(`[nhl-visuel] « ${id} » : le canal « ${prop} » vaut ${JSON.stringify(value)}, `
    + 'qui n’est pas une position. Le nœud est RENDU INVISIBLE plutôt que peint à l’origine, '
    + 'en haut à gauche de la scène. Cherchez la primitive qui l’a placé (scene.place / ctx.reflow).');
}

/** Le nœud redevient visible dès qu'une valeur utilisable arrive sur ce canal. */
function demasquer(element, prop) {
  const s = masques.get(element);
  if (!s || !s.delete(prop)) return;
  if (s.size) { if (element.setAttribute) element.setAttribute(ATTR_SANS_POSITION, [...s].join(' ')); return; }
  masques.delete(element);
  element.style.visibility = '';
  if (element.removeAttribute) element.removeAttribute(ATTR_SANS_POSITION);
}

/**
 * Applique une valeur de canal directement (état de base, ou repli sans WAAPI).
 *
 * ★ La valeur est écrite sur le MAILLON du canal, pas sur la racine : c'est
 * toute la correction du défaut Firefox (voir `enchainer`). Le masque, lui,
 * reste sur la racine — un nœud retiré de la vue l'est en entier.
 */
export function applyProp(element, prop, value) {
  const name = CSS_NAME[prop];
  if (!name) return;
  if (!valeurUtilisable(prop, value)) { masquerSansPosition(element, prop, value); return; }
  demasquer(element, prop);
  const cible = porteurDe(element, prop);
  if (cible && cible.style) cible.style[name] = formatValue(prop, value);
}

/** Applique l'état de base d'un nœud (ce qui est vu avant toute animation). */
export function applyBase(element, node) {
  for (const [prop, value] of Object.entries(node.base)) {
    if (value === null || value === undefined) continue;
    applyProp(element, prop, value);
  }
  // ★ Plus de repli « translate: 0 0 » : un nœud sans position ne se peint pas.
  if (node.base.translate == null) masquerSansPosition(element, 'translate', node.base.translate);
}

/**
 * Applique une mise à jour discrète (canal rAF : texte, `d`, attribut).
 *
 * ★ Le canal discret écrit le TEXTE d'un nœud indépendamment de toute
 * animation : c'est par lui qu'un nœud mal placé devient LISIBLE, et c'est
 * pourquoi un tel défaut ne se voit qu'en lecture. Avant d'écrire, on vérifie
 * donc les deux conditions qui feraient d'un nœud un jeton orphelin :
 *   · il n'est plus dans le document (détaché) ;
 *   · il n'a pas de position utilisable (il est masqué par le filet ci-dessus).
 * Dans les deux cas on écrit une alerte — une seule fois par canal — et on
 * n'écrit PAS le texte : un nœud sans place ne doit rien avoir à dire.
 */
export function applyDiscrete(element, channel, value) {
  const detache = element.isConnected === false;
  if (detache || sansPosition(element)) {
    const id = element.getAttribute ? element.getAttribute('data-nhl-id') : null;
    const cle = `discret::${id}::${channel}`;
    if (!dejaSignale.has(cle)) {
      dejaSignale.add(cle);
      console.error(`[nhl-visuel] « ${id} » reçoit « ${channel} » = ${JSON.stringify(value)} alors qu’il est `
        + `${detache ? 'DÉTACHÉ du document' : 'SANS POSITION utilisable'}. `
        + 'Le texte n’est pas écrit : un nœud sans place ne doit rien avoir à dire.');
    }
    return;
  }
  const contenu = contenuDe(element);
  if (channel === 'text') {
    const target = contenu.tagName === 'text' ? contenu : contenu.querySelector('text');
    if (target && target.textContent !== value) target.textContent = value;
    return;
  }
  if (channel === 'd') {
    const target = contenu.tagName === 'path' ? contenu : contenu.querySelector('path');
    if (target) target.setAttribute('d', value);
    return;
  }
  if (channel.startsWith('attr:')) {
    contenu.setAttribute(channel.slice(5), value);
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0;
}
