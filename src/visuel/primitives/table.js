/**
 * `table` — une **table de correspondance affichée**.
 *
 * ## Le principe, et ce qu'il généralise
 *
 * Le « tiret du 6 » ne se contente pas d'annoncer que `-` vaut 6 : il fait
 * monter un clavier, allume la touche, y envoie le caractère, et fait
 * redescendre le chiffre. Une conversion par table **n'est vérifiable que si la
 * table est sous les yeux** — `P = 7` est une affirmation tant qu'on n'a pas vu
 * la colonne du 7.
 *
 * Cette primitive est ce geste, une fois pour toutes. Le geste ne change
 * jamais : *la lettre monte vers la table, sa case s'allume, la valeur en
 * redescend aussitôt à sa place*. Seule la **mise en page** varie, et elle est
 * une option, pas une primitive de plus (`../assets.js`, `tableGeometry`) :
 *
 * | `disposition` | une case porte | méthodes |
 * |---------------|----------------|----------|
 * | `reglette`    | **une lettre** et sa valeur | toutes, sauf le pavé |
 * | `glissiere`   | **une lettre**, sur deux réglettes alignées | Atbash, César |
 * | `pave`        | les lettres d'une touche | T9 (ITU E.161) |
 *
 * ★ **Seul le clavier téléphonique a plusieurs lettres pour un chiffre**, et
 * c'est la réalité de l'objet. Partout ailleurs, une case = une lettre + un
 * nombre, dans l'ordre alphabétique : le lecteur y cherche SA lettre.
 *
 * ★ **Et la valeur n'est pas forcément un nombre.** Un chiffrement par
 * substitution convertit lettre → LETTRE : la table reste la même abstraction,
 * le même geste, la même mutualisation de décor — c'est la mise en page qui
 * change, parce que ce qu'il y a à montrer change. Voir `glissiere`, plus bas.
 *
 * Deux options de réglette, qui démontrent au lieu de décorer :
 *
 *  - `cycle: true` — retour à la ligne **là où la table recommence**. La
 *    pythagoricienne réduit le rang modulo 9 : les rangées `A…I`, `J…R`, `S…Z`
 *    s'alignent alors colonne par colonne (`A J S` = 1, `B K T` = 2), et la
 *    règle se VOIT. ★ Le découpage est dérivé des valeurs, et la primitive
 *    **refuse** la mise en page si les colonnes ne se répondent pas : une
 *    table non cyclique ne peut pas emprunter ce dessin pour se faire passer
 *    pour régulière.
 *  - `teinte: 'valeur'` — fond de case d'autant plus contrasté que la valeur
 *    est grande (Scrabble). Elle **redouble** le nombre écrit dans la case,
 *    elle ne le remplace pas : rien ne repose sur la couleur seule.
 *
 * ## ★ `glissiere` — deux alphabets, et la règle se lit d'un coup d'œil
 *
 * L'Atbash n'a pas de nombre à faire redescendre : il rend une LETTRE. Écrire
 * `A → Z` dans une case resterait une affirmation, vingt-six fois répétée. Ce
 * qu'il faut montrer, c'est le rapport entre deux alphabets — alors on dessine
 * les deux alphabets :
 *
 * ```
 *   A B C D … M N … X Y Z        l'alphabet
 *   Z Y X W … N M …  C B A       le même, retourné bout pour bout
 * ```
 *
 * Le miroir se constate : `A` est en face de `Z`, `B` en face de `Y`, et l'axe
 * de la symétrie tombe pile au milieu de la bande (`M|N`, `N|M`). Pour César,
 * la bande du bas est la même réglette **glissée** de treize rangs, et la
 * COUTURE — le vide où le glissement ramène au début de l'alphabet — montre le
 * modulo comme le retour à la ligne de la pythagoricienne montre le sien.
 *
 * ★ Le dessin se refuse à qui ne le mérite pas, exactement comme `cycle` : si
 * la réglette du bas n'est pas l'alphabet parcouru d'un pas constant de ±1,
 * alors elle n'est pas la réglette du haut déplacée, et la mise en page
 * affirmerait une régularité inexistante. `pasDeGlissiere` (`../assets.js`) est
 * l'oracle ; la compilation échoue si le compte n'y est pas.
 *
 * ★ Le halo couvre alors la COLONNE — les deux réglettes ensemble : c'est le
 * lien vertical qui est la correspondance, pas l'une ou l'autre case.
 *
 * ## ★ Un aller-retour par lettre, complet, jamais groupé
 *
 * **Une lettre part, sa valeur revient — puis seulement la lettre suivante.**
 * Faire partir les quatre lettres puis revenir les quatre nombres d'un bloc
 * fait gagner du temps et perdre la démonstration : on ne voit plus QUELLE
 * lettre a donné QUEL nombre, c'est-à-dire précisément ce qu'il fallait
 * montrer. Une op `table` traite donc **un jeton** (`target`), et l'émetteur
 * émet **un step par lettre**.
 *
 * ## ★ Ce qu'on mutualise : le DÉCOR, pas le geste
 *
 * L'économie ne porte pas sur l'aller-retour, elle porte sur le déploiement.
 * Quand plusieurs conversions consécutives emploient la même table, celle-ci
 * **reste montée d'une étape à l'autre** :
 *
 *  - `montre: true`  — la table se déploie (elle monte, la caméra recule) ;
 *  - ni l'un ni l'autre — elle est déjà là, on ne la retouche pas ;
 *  - `retire: true`  — elle se replie, la caméra revient.
 *
 * L'identité du nœud est **dérivée du dessin lui-même** (`cleDeTable`) : deux
 * ops qui montrent la même table adressent le même nœud, et deux tables
 * différentes ne peuvent pas se confondre. Une méthode qui change, c'est une
 * table qui change : l'ancienne se retire, la nouvelle se déploie.
 *
 * Le nœud n'est jamais retiré du DOM (CONTRACTS §3.2 règle 7) et chaque fondu
 * est `forwards` : **revenir en arrière sur une étape où la table était déjà
 * montée ne la fait pas clignoter** — aucune animation ne la touche pendant ces
 * étapes, donc l'état conservé est celui du fondu d'entrée.
 *
 * ## Contrôle croisé — la table dessinée est celle de l'opérateur
 *
 * Les correspondances voyagent DANS l'op (`entries`), **dérivées de la fonction
 * même de l'opérateur** (`src/moteur/transformations/mappeurs.js` les obtient
 * en appliquant `fn` aux vingt-six lettres). Le moteur visuel ne les recopie
 * pas : il ne peut pas, sans créer la seconde source de vérité que ce projet
 * refuse. Il refuse en revanche de faire redescendre une valeur qui ne serait
 * pas celle qu'il DESSINE — si `to.text` diffère de la case, la compilation
 * échoue.
 *
 * ★ Une exception, et c'est la seule : l'alphabet. Pour `ordre: 'a1z26'` ou
 * `'z26a1'`, le rang se **recalcule ici** (`alphabetValue`), sans rien croire
 * du scénario ; et si l'émetteur fournit tout de même ses `entries`, elles sont
 * confrontées à cet oracle case par case.
 *
 * ## Caméra
 *
 * Une grille, c'est large ET haut. CONTRACTS §3.2 règle 6 — on n'anime
 * **jamais** l'attribut `viewBox` : on anime le `scale` et le `translate` du
 * groupe `@camera`, et le facteur est **calculé** sur l'encombrement réel. Une
 * op de caméra par step, jamais deux (`../scenario.js` le refuse statiquement).
 * Le recul se paie au déploiement et le retour au repli : entre les deux, la
 * caméra ne bouge plus, et les lettres se succèdent dans un cadrage stable.
 */

import { tokenSpec, ancreVue } from './helpers.js';
// ★ Le geste — monter le décor, allumer la case, faire passer le caractère
//   PAR-DESSUS, faire redescendre la valeur — est écrit une seule fois, et
//   `keyboard` l'appelle aussi. Deux gestes ne peuvent plus diverger.
import {
  monterDecor, allerRetour, replierDecor, substituerSeul, decorEnLAir,
  TEMPS as TEMPS_DECOR,
} from './decor.js';
// ★ La seconde réglette d'une glissière n'est pas dessinée avec la table : elle
//   est faite de cases à part, parce qu'elle DOIT pouvoir bouger — elle paraît
//   alignée sur la première, puis se déplace pour montrer le déplacement que la
//   table, sans cela, se contenterait d'affirmer.
import { poserBande, finDuDeplacement } from './glissiere.js';
import {
  tableGeometry, alphabetEntries,
  normalizeOrdre, normalizeDisposition, ALPHABET_ORDRES, DISPOSITIONS, TEINTES,
} from '../assets.js';
import { fail } from '../errors.js';

export const name = 'table';

/** Marge verticale laissée libre par la caméra, en unités viewBox. */
const PAD = 32;

/**
 * ★ Deux valeurs de case sont-elles la même ?
 *
 * La valeur d'une case peut être une LETTRE (chiffrements par substitution), et
 * la réglette est écrite en capitales alors que la ligne garde sa casse : `h`
 * cherche sa case dans `H`, et en redescend `s` là où la case porte `S`. On
 * compare donc **à la casse près** — exactement le pliage qu'appliquent
 * `atbash` et `cesar` (`moteur/tables/alphabet.js`), qui passent la lettre en
 * capitale, la convertissent, puis lui rendent sa casse.
 *
 * ★ La casse, et rien d'autre : un `é` reste distinct d'un `E`, et un nombre
 * n'a pas de casse — le contrôle des tables lettre → nombre est inchangé.
 */
const memeValeur = (a, b) => String(a).toUpperCase() === String(b).toUpperCase();

export function plan(ctx) {
  const op = ctx.op;

  if (op.ordre !== undefined && !ALPHABET_ORDRES.includes(op.ordre)) {
    fail(`${ctx.where}« ordre » = ${JSON.stringify(op.ordre)} — les deux numérotations modélisées sont ${ALPHABET_ORDRES.join(' et ')}.`);
  }
  if (op.disposition !== undefined && !DISPOSITIONS.includes(op.disposition)) {
    fail(`${ctx.where}« disposition » = ${JSON.stringify(op.disposition)} — les mises en page modélisées sont ${DISPOSITIONS.join(', ')}. `
      + 'Seul le clavier téléphonique met plusieurs lettres dans une case.');
  }
  if (op.teinte !== undefined && !TEINTES.includes(op.teinte)) {
    fail(`${ctx.where}« teinte » = ${JSON.stringify(op.teinte)} — le seul encodage modélisé est ${TEINTES.join(', ')}.`);
  }
  if (op.cycle !== undefined && typeof op.cycle !== 'boolean') {
    fail(`${ctx.where}« cycle » doit être un booléen.`);
  }
  if (op.titre !== undefined && typeof op.titre !== 'string') {
    fail(`${ctx.where}« titre » doit être une chaîne — le nom de l'outil, déjà traduit, tel que le catalogue le porte.`);
  }

  const disposition = normalizeDisposition(op.disposition);
  const entries = entreesDe(ctx);
  if (!entries.length) {
    fail(`${ctx.where}« entries » manquant : une table de correspondance sans correspondance ne montre rien. `
      + 'Fournissez [{char, value, note?}], ou « ordre » pour la réglette alphabétique.');
  }

  const geo = tableGeometry({
    entries, disposition, colonnes: op.colonnes, cycle: op.cycle === true, teinte: op.teinte,
  });
  // ★ La glissière d'abord : c'est elle qui refuse `cycle` et `teinte`, et le
  //   contrôle du cycle n'a aucun sens sur des colonnes de deux lettres.
  if (disposition === 'glissiere') verifierGlissiere(ctx, op, geo);
  else if (disposition === 'modulo') verifierModulo(ctx, op, geo);
  else if (op.cycle === true) verifierCycle(ctx, geo);
  const src = ctx.scene.live(op.target, `${ctx.where}« target » : `);
  const to = op.to === undefined || op.to === null ? null : tokenSpec(ctx, op.to, 'to');

  const lettre = String(op.letter ?? ([...src.text].length === 1 ? src.text : '')).toUpperCase();
  const place = lettre ? geo.index[lettre] : null;
  if (place && to !== null && !memeValeur(place.value, to.text)) {
    fail(`${ctx.where}« to.text » annonce « ${to.text} », mais la table montre ${place.value} `
      + `pour « ${lettre} ». Le moteur visuel refuse d’afficher autre chose que ce qui est montré.`);
  }

  // ★ Le TITRE fait partie de l'identité du décor. Deux ops qui dessinent la
  //   même table mais l'annoncent autrement ne montrent pas le même outil : les
  //   confondre laisserait la seconde s'afficher sous le nom de la première.
  const titre = typeof op.titre === 'string' ? op.titre.trim() : '';
  const board = `@table:${cleDeTable(disposition, geo, titre)}`;
  // ★ Le décor se mutualise, le geste non. On déploie quand on nous le demande
  //   — et de toute façon quand la table n'existe pas encore, pour qu'une op
  //   isolée reste autosuffisante.
  const deployer = !decorEnLAir(ctx, board) || op.montre === true;
  const replier = op.retire !== false;

  // Dégradation propre, comme le clavier : un caractère hors de la table (un
  // chiffre, un tiret, un « é » non replié) ne fait pas tomber la page. On ne
  // met pas en scène une case qu'on ne sait pas dessiner — mais on honore tout
  // de même le repli, sans quoi la table resterait en l'air.
  if (!place) {
    substituerSeul(ctx, src, to);
    if (!deployer && replier && decorEnLAir(ctx, board)) replierDecor(ctx, board, 0);
    return;
  }

  // La table se pose au centre de la VUE — pas du viewBox : si la ligne défile,
  // le milieu de l'écran n'est plus le milieu de la scène (`ancreVue`).
  const vue = ancreVue(ctx);
  const boardPos = {
    x: vue.x,
    y: vue.y + ctx.metrics.fontSize * 1.0 + geo.height / 2,
  };

  // ── 1. le décor : monté maintenant, ou déjà là ──────────────────────────
  //   ★ En glissière, la table ne dessine que la réglette du HAUT : celle du
  //   bas est faite de cases mobiles (`glissiere.js`), qui paraissent alignées
  //   sur elle avant de se déplacer.
  const bandeSeparee = disposition === 'glissiere';
  // Le nom d'une glissière ne paraît qu'une fois sa bande arrivée : c'est le
  // déplacement qui prouve la règle, le nom ne fait que la conclure.
  const titreAt = bandeSeparee && deployer
    ? finDuDeplacement(ctx.dur, ctx.dur * TEMPS_DECOR.MONTEE)
    : 0;
  let t0 = monterDecor(ctx, {
    id: board, role: 'table', titre, data: { geo, disposition, bandeSeparee },
    pos: boardPos, width: geo.width, deployer, titreAt,
    encombrement: {
      haut: boardPos.y - geo.height / 2,
      bas: boardPos.y + geo.height / 2,
      largeur: geo.width,
      pad: PAD,
    },
  });
  if (bandeSeparee) t0 = poserBande(ctx, { board, boardPos, geo, deployer, t0 });

  // ── 2. l'aller-retour de CETTE lettre, en entier ────────────────────────
  //   ★ Le geste est celui du clavier, au mot près (`decor.js`) : la lettre
  //   passe PAR-DESSUS la table, la case s'allume quand elle arrive, et la
  //   valeur redescend d'où elle se lit — sous la lettre en réglette, à la
  //   tête de la touche sur le pavé, sur la réglette du bas en glissière.
  //
  //   ★ Ce qu'on allume n'est pas toujours une case : la géométrie peut
  //   désigner une boîte à part (`place.halo`). En glissière c'est la COLONNE
  //   — les deux réglettes d'un coup —, parce que la correspondance est le lien
  //   vertical entre elles, pas l'une ou l'autre lettre. Même raison que la
  //   mesure « colonne » du clavier, qui éclaire la colonne et sa graduation.
  const cell = geo.cells[place.cell];
  const boite = place.halo || { cx: cell.cx, cy: cell.cy, w: cell.w, h: cell.h };
  const fin = allerRetour(ctx, {
    src, to, t0, kind: 'number',
    case: {
      id: `@case:${src.id}`, w: boite.w, h: boite.h, rx: 5,
      x: boardPos.x + boite.cx, y: boardPos.y + boite.cy,
    },
    arrivee: { x: boardPos.x + place.lettre.x, y: boardPos.y + place.lettre.y },
    source: { x: boardPos.x + place.valeur.x, y: boardPos.y + place.valeur.y },
  });

  // ── 3. le décor se retire — seulement si la suite ne l'emploie plus ─────
  if (replier) replierDecor(ctx, board, fin);
}

/* ── ce qu'il y a à montrer ──────────────────────────────────────────────── */

/**
 * Clé d'identité d'une table — **dérivée du dessin**, pas d'un nom donné.
 *
 * Deux ops qui montrent exactement la même table partagent le même nœud, donc
 * le décor se mutualise sans que personne ait à le déclarer ; deux tables qui
 * diffèrent d'une seule case ne peuvent pas se confondre, donc un changement de
 * méthode retire bien l'ancienne. FNV-1a, en base 36.
 */
function cleDeTable(disposition, geo, titre = '') {
  const src = `${disposition}|${geo.cols}×${geo.rows}|${titre}|`
    + geo.cells.map((c) => `${c.key}@${c.ligne},${c.col}~${c.teinte ?? ''}:${c.labels.map((l) => l.text).join('/')}`).join(';');
  let h = 0x811c9dc5;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * ★ Contrôle croisé de la mise en page cyclique.
 *
 * Casser la ligne à chaque retour au 1, c'est AFFIRMER que la table est
 * cyclique — et l'affirmation se lit dans l'alignement : chaque colonne doit
 * porter une seule et même valeur, sur toutes ses rangées. Si ce n'est pas le
 * cas, le dessin suggérerait une régularité qui n'existe pas. On le refuse
 * plutôt que de le dessiner : c'est exactement le refus qui protège la
 * chaldéenne, dont les valeurs ne se répètent pas cycliquement.
 *
 * La dernière rangée peut être plus courte (l'alphabet ne fait pas un compte
 * rond de cycles) : on ne compare que les colonnes réellement occupées.
 */
function verifierCycle(ctx, geo) {
  const parColonne = new Map();
  for (const c of geo.cells) {
    const valeur = c.labels.length ? c.labels[c.labels.length - 1].text : '';
    const vu = parColonne.get(c.col);
    if (vu === undefined) { parColonne.set(c.col, { valeur, key: c.key }); continue; }
    if (vu.valeur !== valeur) {
      fail(`${ctx.where}« cycle » : la colonne ${c.col + 1} porte ${vu.valeur} pour « ${vu.key} » `
        + `et ${valeur} pour « ${c.key} ». Casser la ligne à chaque retour du cycle affirmerait `
        + 'une régularité que cette table n’a pas — le moteur visuel refuse de la mettre en page ainsi.');
    }
  }
}

/**
 * ★ Contrôle croisé de la glissière — jumeau de `verifierCycle`.
 *
 * Dessiner deux réglettes alignées, c'est AFFIRMER que celle du bas est celle
 * du haut **déplacée** : retournée (Atbash) ou glissée (César). L'affirmation
 * se vérifie sur les valeurs — le pas d'un bout à l'autre doit être constant,
 * +1 ou −1 modulo 26 — et si elle est fausse, le dessin ferait passer une
 * substitution quelconque pour une règle. On le refuse plutôt que de le
 * dessiner : c'est le refus qui donne sa valeur au dessin quand il est accepté.
 *
 * L'oracle est `pasDeGlissiere` (`../assets.js`), et il ne lit QUE les valeurs
 * de la table — celles-là mêmes qui sont dérivées de la fonction de
 * l'opérateur. Le dessin, la conversion et la règle affichée ne peuvent donc
 * pas se contredire.
 */
function verifierGlissiere(ctx, op, geo) {
  if (op.cycle === true) {
    fail(`${ctx.where}« cycle » et « glissiere » ne vont pas ensemble : la glissière n’a pas de rangées `
      + 'à découper, elle EST deux réglettes — et sa couture dit déjà où le déplacement revient au début.');
  }
  if (op.teinte !== undefined) {
    fail(`${ctx.where}« teinte » n’a rien à encoder sur une glissière : sa bande dit un DÉPLACEMENT, `
      + 'et un déplacement d’un cran n’est ni plus grand ni plus petit qu’un autre.');
  }
  if (geo.sens) return;
  const couples = geo.couples || [];
  const dit = couples.map((c) => `${c.char}→${c.value}`).slice(0, 4).join(', ');
  fail(`${ctx.where}« glissiere » : la réglette du bas (${dit}${couples.length > 4 ? '…' : ''}) `
    + 'ne descend ni ne monte d’un pas constant de ±1 — ce n’est donc pas la réglette du haut '
    + 'déplacée, et deux bandes alignées affirmeraient une règle que cette table n’a pas. '
    + 'La bande peut porter des lettres (un alphabet déplacé) ou une numérotation de 1 à 26 : '
    + 'ce qui est exigé est le PAS, pas la matière. '
    + 'Le moteur visuel refuse de la mettre en page ainsi : une réglette ordinaire dit la vérité.');
}

/**
 * ★ Contrôle croisé de la table des restes — troisième du même genre.
 *
 * Écrire le barème UNE FOIS en tête de colonne, c'est AFFIRMER que tous les
 * nombres de cette colonne ont ce reste-là. Si deux d'entre eux ne l'ont pas,
 * la quotation ment pour l'un des deux, et le spectateur qui vérifie — c'est
 * tout l'objet de la mise en page — trouve la faute avant nous. On refuse donc
 * de dessiner, comme `cycle` refuse d'aligner des colonnes qui ne se répondent
 * pas et comme `glissiere` refuse deux bandes qui ne se déduisent pas l'une de
 * l'autre.
 *
 * `geo.discordance` est l'oracle, et il ne lit QUE les valeurs de la table —
 * celles-là mêmes qui viennent de la fonction de l'opérateur.
 */
function verifierModulo(ctx, op, geo) {
  if (op.cycle === true) {
    fail(`${ctx.where}« cycle » et « modulo » ne vont pas ensemble : une table des restes EST déjà `
      + 'découpée au cycle — c\'est sa largeur qui vaut le modulo, et sa quotation qui le dit.');
  }
  if (op.teinte !== undefined) {
    fail(`${ctx.where}« teinte » n’a rien à encoder sur une table des restes : un reste de 8 n’est `
      + 'ni plus grand ni plus fort qu’un reste de 1, il est juste dans une autre colonne.');
  }
  if (!geo.discordance) return;
  const d = geo.discordance;
  fail(`${ctx.where}« modulo » : la colonne ${d.col + 1} porte ${d.a.valeur} pour « ${d.a.key} » `
    + `et ${d.b.valeur} pour « ${d.b.key} ». Le barème est écrit UNE FOIS en tête de colonne : `
    + 'l’écrire là revient à affirmer que toute la colonne le partage, et le moteur visuel refuse '
    + 'de l’affirmer pour une colonne qui ne le fait pas.');
}

/**
 * Les correspondances de la table, et leur contrôle croisé quand il existe.
 *
 * `ordre` déclenche l'oracle indépendant de l'alphabet : le moteur visuel
 * fabrique lui-même la réglette, et si l'émetteur a joint la sienne, la
 * moindre divergence fait échouer la compilation.
 */
function entreesDe(ctx) {
  const op = ctx.op;
  const fournies = Array.isArray(op.entries) ? op.entries : null;
  if (op.ordre === undefined) {
    if (!fournies) return [];
    for (const e of fournies) {
      if (!e || typeof e !== 'object' || typeof e.char !== 'string' || !e.char
        || e.value === undefined || e.value === null) {
        fail(`${ctx.where}« entries » : chaque correspondance s'écrit {char, value, note?} — reçu ${JSON.stringify(e)}.`);
      }
    }
    return fournies;
  }

  const ordre = normalizeOrdre(op.ordre);
  const oracle = alphabetEntries(ordre);
  if (fournies) {
    const dit = new Map(fournies.map((e) => [String(e && e.char).toUpperCase(), String(e && e.value)]));
    for (const e of oracle) {
      const v = dit.get(e.char);
      if (v !== undefined && v !== String(e.value)) {
        fail(`${ctx.where}la table annoncée donne « ${e.char} = ${v} », mais la réglette ${ordre === 'z26a1' ? 'Z=1 … A=26' : 'A=1 … Z=26'} montre ${e.value}. `
          + 'Le moteur visuel refuse de dessiner autre chose que le rang qu’il sait recalculer.');
      }
    }
  }
  return oracle;
}

