/**
 * ★ LA SECONDE RÉGLETTE — comment elle arrive, et pourquoi elle bouge.
 *
 * La glissière (`table.js`, disposition `glissiere`) dessine deux alphabets
 * alignés : celui du haut à l'endroit, celui du bas **déplacé**. Retourné bout
 * pour bout pour l'Atbash, glissé de treize rangs pour le César classique.
 *
 * Le dessin dit la règle — mais il la dit *déjà faite*. On voit `A` en face de
 * `N` et l'on doit CROIRE que la bande du bas est la bande du haut déplacée :
 * rien à l'écran ne l'a montré. L'auteur : « affiche-la sans le décalage de la
 * 2nde ligne, puis fais coulisser […] (bref une translation qui permet de mieux
 * comprendre le décalage) ».
 *
 * D'où ce module. La seconde réglette **paraît identique à la première** — deux
 * fois l'alphabet, colonne par colonne, ce qui n'affirme rien —, puis elle se
 * déplace sous les yeux du spectateur, et se pose sur ce que la table
 * affirmait. Le déplacement n'est plus une légende, c'est un mouvement.
 *
 * ## Deux déplacements, parce qu'il n'y en a que deux
 *
 * `pasDeGlissiere` (`../assets.js`) n'admet qu'un pas constant de ±1, et c'est
 * exactement la frontière entre les deux gestes :
 *
 * · **`sens: +1` — LE COULISSEMENT** (César, tous décalages). La bande du bas
 *   glisse d'un bloc, sans se déformer. Ce qui sort d'un côté rentre par
 *   l'autre **dans le même mouvement** : la case qui franchit le bord disparaît
 *   et sa jumelle paraît au bord opposé au même instant, ce qui est la
 *   définition même du modulo — et ce que la COUTURE du dessin fixe une fois la
 *   bande arrêtée.
 *
 * · **`sens: −1` — LE RETOURNEMENT** (Atbash). Il n'y a pas de glissement : la
 *   bande se retourne. Chaque case suit une **trajectoire elliptique** entre sa
 *   place de départ et sa place d'arrivée — et, comme les demi-axes de toutes
 *   les ellipses sont proportionnels à la distance parcourue, **les vingt-six
 *   cases restent alignées à chaque instant** : la bande est une droite qui
 *   pivote autour de son milieu. C'est ce que demandait l'auteur : « une
 *   trajectoire elliptique pour garder l'alignement tout en montrant que chaque
 *   caractère passe de sa position initiale à sa position finale ».
 *
 * ## ★ Le décalage n'est écrit NULLE PART ici
 *
 * Il est LU sur la table : la case du bas qui porte la lettre `v` part de la
 * colonne où le haut porte `v`, et arrive à la colonne où l'opérateur l'a
 * placée. Le nombre de crans, le sens, la couture — tout se déduit des
 * correspondances, c'est-à-dire de la fonction même de l'opérateur (CONTRACTS
 * §0.3). Un César de 7 rangs coulissera de 7 sans qu'une ligne change ici, et
 * un chiffrement qui ne serait pas un déplacement n'aurait de toute façon pas
 * obtenu ce dessin.
 *
 * ## ★ Le sens du coulissement : le plus court, et à égalité vers la droite
 *
 * Glisser de `p` rangs vers la droite ou de `26 − p` vers la gauche donne la
 * MÊME bande : le modulo ne distingue pas. On prend donc le plus court — c'est
 * celui qui se lit, et sur un décalage de 3 personne n'a envie de regarder
 * courir 23 cases. À égalité (treize, le César classique, seul cas où les deux
 * chemins font la même longueur) on va vers la DROITE, comme l'auteur l'a
 * décrit : « fais coulisser la partie gauche de 13 crans pour la placer sous
 * celle de droite ».
 */

import { EASE } from '../constants.js';

export const ROLE_CASE = 'case';

/**
 * Le temps de la bande, en fractions de la durée d'op — après la montée du
 * décor, avant l'aller-retour de la lettre.
 *
 * `REPOS` n'est pas du remplissage : la bande arrivée doit être LUE avant que
 * la première lettre ne s'envole, sinon le mouvement n'aura servi à rien.
 */
const TEMPS = Object.freeze({ ATTENTE: 0.05, COURSE: 0.45, REPOS: 0.08 });

/** Points d'échantillonnage d'une ellipse — assez pour que l'arc soit un arc. */
const ECHANTILLONS = 12;

/**
 * ★ L'aplatissement des ellipses du retournement.
 *
 * Un vrai demi-tour de la bande (demi-cercles) enverrait les cases extrêmes à
 * treize colonnes au-dessus et au-dessous de la réglette : hors de la scène. On
 * aplatit donc, et le facteur est **borné par la hauteur utile** : au-delà, les
 * cases sortiraient du cadre — or la caméra ne recule qu'une fois, au
 * déploiement, et pas pour une excursion d'une demi-seconde.
 *
 * Ce qui compte est préservé : les demi-axes verticaux restent proportionnels
 * aux horizontaux, donc l'alignement tient à chaque instant.
 */
const APLATISSEMENT = 0.13;

/** Fenêtre de fondu d'une case qui franchit un bord, en fraction de la course. */
const FONDU_BORD = 0.07;

/**
 * Prépare — et anime, s'il y a lieu — la seconde réglette d'une glissière.
 *
 * @param {object} ctx
 * @param {object} spec
 * @param {string} spec.board       le nœud du décor (la bande lui est solidaire)
 * @param {{x:number,y:number}} spec.boardPos  le centre du décor, en coordonnées scène
 * @param {object} spec.geo         la géométrie rendue par `tableGeometry`
 * @param {boolean} spec.deployer   la table monte-t-elle maintenant ?
 * @param {number} spec.t0          l'instant où le décor est en place
 * @returns {number} l'instant où la lettre peut commencer son aller-retour
 */
export function poserBande(ctx, spec) {
  const { board, boardPos, geo, deployer, t0 } = spec;
  const T = ctx.dur;
  const plan = trajectoires(geo, board);
  const noeud = ctx.scene.get(board);
  if (!noeud.data.bande) noeud.data.bande = [];

  // Où chaque case se trouve, en coordonnées scène.
  const scene = (p) => ({ x: boardPos.x + p.x, y: boardPos.y + p.y });

  // ── 1. les cases existent, ou naissent ─────────────────────────────────
  for (const c of plan.cases) {
    if (ctx.scene.has(c.id)) continue;
    ctx.scene.create({
      id: c.id, role: ROLE_CASE, inFlow: false, w: c.w,
      data: { h: c.h, rx: 4, texte: c.texte, taille: c.taille, tone: c.tone },
      base: { opacity: 0, translate: scene(c.arrivee) },
    }, { where: ctx.where });
    ctx.scene.place(c.id, scene(c.arrivee));
    noeud.data.bande.push(c.id);
  }

  // ── 2. décor déjà monté : la bande le SUIT, et rien de plus ────────────
  //
  // Le déplacement ne se rejoue pas à chaque lettre — il ne se rejouerait
  // d'ailleurs pas, il se contredirait : la bande est arrivée, la montrer
  // repartir dirait qu'elle n'y était pas.
  if (!deployer) {
    for (const c of plan.cases) {
      if (c.fantome) continue;
      ctx.place(c.id, scene(c.arrivee), { at: 0, dur: T * 0.2 });
    }
    return t0;
  }

  // ── 3. le déploiement : la bande paraît ALIGNÉE, puis se déplace ───────
  const debut = t0 + T * TEMPS.ATTENTE;
  const course = T * TEMPS.COURSE;

  for (const c of plan.cases) {
    // On la repose à son point de départ **sans l'animer** : le décor est
    // encore en fondu d'entrée, personne ne voit ce retour à la case départ.
    // (Une table remontée après avoir été repliée rejoue donc son
    // déplacement, ce qui est juste : elle se re-démontre.)
    ctx.scene.place(c.id, scene(c.depart));
    // ★ Ce qui est VISIBLE au départ : la réglette du bas telle qu'elle paraît,
    // c'est-à-dire l'alphabet à l'identique — les cases qui resteront ET les
    // fantômes qui occupent les colonnes que le déplacement videra. Les
    // jumelles, elles, attendent hors de la bande : les montrer flotter à côté
    // de la table démentirait le dessin avant même qu'il ait commencé.
    //
    // ★ Un fantôme n'a qu'UNE animation d'opacité, du fondu d'entrée jusqu'à
    // sa sortie par le bord. Deux animations d'un même canal qui se
    // chevauchent sont un avertissement de compilation — et surtout un état
    // ambigu au scrubbing (`compile.js`, « conflits d'animation »).
    if (c.bord === null) {
      ctx.anim({ id: c.id, prop: 'opacity', to: 1, at: t0, dur: T * 0.12 });
    } else if (c.fantome) {
      const total = T * (TEMPS.ATTENTE + TEMPS.COURSE);
      const f = (T * TEMPS.ATTENTE) / total;
      const [a, b] = fenetre(c.bord);
      ctx.anim({
        id: c.id, prop: 'opacity',
        values: [0, 1, 1, 0, 0],
        offsets: [0, f, f + (1 - f) * a, f + (1 - f) * b, 1],
        at: t0, dur: total, ease: EASE.fade,
      });
    }
    if (c.trajet.length > 2) {
      ctx.anim({
        id: c.id,
        prop: 'translate',
        values: c.trajet.map(scene),
        offsets: c.trajet.map((_, i) => i / (c.trajet.length - 1)),
        at: debut,
        dur: course,
        ease: EASE.move,
      });
    } else {
      ctx.anim({
        id: c.id, prop: 'translate', from: scene(c.depart), to: scene(c.arrivee),
        at: debut, dur: course, ease: EASE.move,
      });
    }
    // Le franchissement du bord : ce qui sort d'un côté rentre par l'autre AU
    // MÊME INSTANT — c'est le modulo, joué plutôt qu'annoncé. (La sortie du
    // fantôme est déjà comprise dans son unique animation d'opacité, plus
    // haut ; il ne reste ici que l'entrée de la jumelle.)
    if (c.bord !== null && !c.fantome) {
      const [a, b] = fenetre(c.bord);
      ctx.anim({
        id: c.id, prop: 'opacity',
        values: [0, 0, 1, 1],
        offsets: [0, a, b, 1],
        at: debut, dur: course, ease: EASE.fade,
      });
    }
    ctx.scene.place(c.id, scene(c.arrivee));
  }

  return debut + course + T * TEMPS.REPOS;
}

/** Les deux instants du fondu d'un franchissement, strictement croissants. */
function fenetre(u) {
  const a = Math.min(Math.max(u - FONDU_BORD, 0.02), 0.94);
  return [a, Math.min(a + 2 * FONDU_BORD, 0.98)];
}

/**
 * ★ Le plan de vol de la seconde réglette — LU sur la table, jamais supposé.
 *
 * Chaque case du bas porte une lettre `v` : elle ARRIVE à la colonne où
 * l'opérateur l'a placée, et elle PART de la colonne où le haut porte cette
 * même lettre — c'est-à-dire de la position qu'elle occuperait si la table ne
 * déplaçait rien. Entre les deux, un coulissement ou un retournement.
 *
 * @returns {{cases:Array}} de quoi créer et animer chaque case
 */
function trajectoires(geo, board) {
  const hautes = geo.cells.filter((c) => c.ligne === 0);
  const basses = geo.cells.filter((c) => c.ligne === 1);
  const n = basses.length;
  const parLettre = new Map(hautes.map((c) => [String(c.labels[0].text).toUpperCase(), c]));
  const colonneDe = new Map(hautes.map((c, i) => [String(c.labels[0].text).toUpperCase(), i]));

  const cases = [];
  const depart = (bas) => parLettre.get(String(bas.labels[0].text).toUpperCase());
  // Une bande dont une case ne retrouve pas sa jumelle en haut n'est pas un
  // déplacement de la réglette : on ne l'anime pas — le dessin, lui, reste
  // exact. (`pasDeGlissiere` l'aurait déjà refusé ; ceci est la ceinture.)
  if (basses.some((c) => depart(c) === undefined)) {
    return { cases: basses.map((c, i) => statique(c, i, board)) };
  }

  const gauche = geo.cells[0].x;
  const droite = hautes[n - 1].x + hautes[n - 1].w;
  // Le pas du déplacement, en colonnes — lu sur la première case.
  const pas = ((0 - colonneDe.get(String(basses[0].labels[0].text).toUpperCase())) % n + n) % n;

  if (geo.sens === 1) {
    // ★ LE COULISSEMENT. Le plus court des deux chemins équivalents ; à
    //   égalité, vers la droite (le César classique).
    const versLaDroite = pas <= n - pas;
    const crans = versLaDroite ? pas : n - pas;
    const signe = versLaDroite ? 1 : -1;
    // Δ se MESURE sur une case qui ne franchit aucun bord : elle seule parcourt
    // le déplacement en entier, couture comprise.
    const modele = basses.find((bas, col) => {
      const dep = colonneDe.get(String(bas.labels[0].text).toUpperCase());
      return col === dep + signe * crans;
    });
    const dx = modele
      ? modele.cx - parLettre.get(String(modele.labels[0].text).toUpperCase()).cx
      : signe * crans * geo.cellW;

    basses.forEach((bas, col) => {
      const haut = depart(bas);
      const dep = colonneDe.get(String(bas.labels[0].text).toUpperCase());
      const franchit = col !== dep + signe * crans;
      if (!franchit) {
        cases.push({ ...gabarit(bas, col, board), depart: { x: haut.cx, y: bas.cy }, bord: null });
        return;
      }
      // La case sort par un bord et rentre par l'autre : deux nœuds, un seul
      // mouvement. Le fantôme part de la place visible et s'en va ; la vraie
      // case arrive du bord opposé, au même instant.
      const xEntree = bas.cx - dx;
      cases.push({
        ...gabarit(bas, col, board),
        depart: { x: xEntree, y: bas.cy },
        bord: fraction(xEntree, dx, dx > 0 ? gauche : droite),
      });
      cases.push({
        ...gabarit(bas, col, board, true),
        depart: { x: haut.cx, y: bas.cy },
        arrivee: { x: haut.cx + dx, y: bas.cy },
        bord: fraction(haut.cx, dx, dx > 0 ? droite : gauche),
      });
    });
    return { cases };
  }

  // ★ LE RETOURNEMENT. Une demi-ellipse par case, de sa place à sa place —
  //   creusée vers le bas quand la case part à droite, vers le haut quand elle
  //   part à gauche. Les cases d'un même bord voyagent donc du même côté, et
  //   les deux moitiés de la bande se croisent sans se traverser : c'est le
  //   dessin d'un objet qu'on retourne.
  for (let col = 0; col < n; col++) {
    const bas = basses[col];
    const haut = depart(bas);
    const a = (bas.cx - haut.cx) / 2;
    const cx = (bas.cx + haut.cx) / 2;
    const b = a * APLATISSEMENT;
    const trajet = [];
    for (let k = 0; k <= ECHANTILLONS; k++) {
      const theta = (Math.PI * k) / ECHANTILLONS;
      trajet.push({ x: cx - a * Math.cos(theta), y: bas.cy + b * Math.sin(theta) });
    }
    cases.push({
      ...gabarit(bas, col, board),
      depart: { x: haut.cx, y: bas.cy },
      trajet,
      bord: null,
    });
  }
  return { cases };
}

/** Une case qui ne bouge pas — le repli quand la bande n'est pas un déplacement. */
function statique(bas, col, board) {
  return { ...gabarit(bas, col, board), depart: { x: bas.cx, y: bas.cy }, bord: null };
}

/** Ce qu'il faut savoir d'une case du bas pour la dessiner et la placer.
 *  L'identité est celle du DÉCOR, colonne par colonne : deux glissières
 *  différentes dans la même scène ne peuvent pas se disputer une case. */
function gabarit(bas, col, board, fantome = false) {
  const l = bas.labels[0];
  return {
    id: `${board}:${fantome ? 'sortant' : 'bas'}:${col}`,
    fantome,
    texte: l.text,
    taille: l.size,
    tone: l.tone,
    w: bas.w,
    h: bas.h,
    arrivee: { x: bas.cx, y: bas.cy },
    trajet: [],
  };
}

/**
 * À quelle fraction de sa course une case franchit le bord de la réglette.
 *
 * Sortie et entrée tombent au même instant — la case qui s'en va à droite et
 * celle qui paraît à gauche sont la même case : c'est ce qui fait voir le
 * modulo au lieu de le dire.
 */
function fraction(xDepart, dx, cible) {
  if (!dx) return null;
  return Math.min(Math.max((cible - xDepart) / dx, 0), 1);
}
