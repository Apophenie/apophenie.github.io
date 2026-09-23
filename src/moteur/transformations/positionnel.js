/**
 * ★ **LA NOTATION POSITIONNELLE — un opérateur appliqué à une partie de la
 * ligne de nombres, et à elle seule.**
 *
 * > « C'est en nombre de caractères donc ça peut couper un nombre ; si je veux
 * >   le nombre, j'élargis pour l'inclure. » (l'autrice, 18 septembre 2026)
 *
 * `position.largeur.largeur…code`, collé devant le code, à l'intérieur de la
 * liste `+` d'un programme : `fl+mpy+mtri+1cs+2cs+mtri+0cs+mr9+mpf`. Ce n'est
 * PAS la recherche qui énumère ces positions — l'explosion serait
 * combinatoire —, c'est une écriture de lien, rejouée telle quelle.
 *
 * ── Ce que les nombres désignent ──────────────────────────────────────────
 *
 * La ligne est lue comme la CONCATÉNATION des chiffres de ses nombres :
 * `3 9 6 1 10` se lit `396110`, six caractères. `position` est l'index (base 0)
 * du premier caractère visé ; chaque `largeur` est un nombre de caractères.
 *
 *  · devant un COMBINATEUR (`cs`, `cp`…) : au moins deux largeurs, autant
 *    d'opérandes. Chacun est la suite de ses caractères, relue comme UN nombre
 *    — `1.2.2cs` sur `1 3 3 3 3` fait `33 + 33`. Le résultat reprend la place
 *    des opérandes ; la ligne reste une ligne ;
 *  · devant un MAPPEUR `NUMS → NUMS` (`mr9`…) : une seule largeur, la fenêtre.
 *    Les nombres y gardent leur découpe, coupée aux bords de la fenêtre ;
 *  · les largeurs IMPLICITES : `1cs` vaut `1.1.1cs` — deux opérandes d'un
 *    caractère —, `5mr9` vaut `5.1mr9`. Même convention que les portées, où
 *    `0` vaut `0.1` (`recherche/url.js › LONGUEUR_IMPLICITE`), et même
 *    argument : la valeur omise n'a qu'une lecture, l'omettre ne perd rien.
 *
 * ★ **UNE FENÊTRE PEUT COUPER UN NOMBRE, et c'est voulu.** Sur `3 9 6 1 10`,
 *   `3.1.1cs` additionne le `1` et le `1` de `10` ; le `0` reste seul, comme
 *   nombre. Il n'est pas recollé après coup : la ligne a été redécoupée, elle
 *   le reste — exactement comme `mrd` laisse ses chiffres éclatés.
 *
 * ⚠️ **CE QUI EST REFUSÉ, BRUYAMMENT** — jamais deviné :
 *   · une famille autre que combinateur ou mappeur `NUMS → NUMS`. La
 *     conversion partielle du TEXTE reste le rôle des portées
 *     (`0.5:mpy,5.12:mch`) : le préfixe est réservé aux lignes de nombres ;
 *   · une fenêtre qui dépasse la ligne ;
 *   · une ligne qui porte un nombre NÉGATIF : son signe n'est pas un chiffre,
 *     compter les caractères n'y aurait plus de sens univoque ;
 *   · un morceau qui commencerait par un ZÉRO et en compterait d'autres
 *     (`105` coupé en `1` | `05`) : `05` se relirait `5`, la ligne perdrait un
 *     caractère sans que rien ne le montre, et toutes les positions écrites
 *     après lui désigneraient autre chose que ce qu'on voit.
 *
 * ★ **L'OPÉRATEUR DÉRIVÉ EST UN OPÉRATEUR COMME LES AUTRES** : `from`, `to`,
 *   `apply`, `steps`, `sortie`. Il garde l'identité de celui qu'il localise —
 *   son `id`, donc son titre, sa notoriété, son caractère de ficelle —, et ne
 *   change que ce que la localisation change : son code, écrit comme dans le
 *   lien, et son type d'arrivée (une somme localisée rend une LIGNE, pas un
 *   nombre). Le rejeu, le scénario et le barème le reçoivent donc sans savoir
 *   qu'il est dérivé.
 *
 * ★ **La grammaire vit à deux endroits**, ici et dans `recherche/url.js`, pour
 *   la même raison que `RE_CODE` : `src/recherche` lit un lien sans le
 *   catalogue. Les deux dérivent de `RE_CODE` et un test exige qu'elles soient
 *   identiques (`url.test.js`).
 */

import {
  RE_CODE, etape, token, enchainer, fusion, tracesDe,
} from './commun.js';
import { nums, num } from '../etat.js';
import { bilingue, dire } from '../i18n.js';
import { lirePreuveCesar } from '../code-preuve-cesar.js';

/** `position(.largeur)*code` — le code, lui, garde toute sa grammaire §4.1. */
export const RE_POSITIONNEL = new RegExp(`^(\\d+)((?:\\.\\d+)*)(${RE_CODE.source.slice(1, -1)})$`);

/**
 * Les largeurs qu'un préfixe sans point désigne, par lettre de famille. Il n'y
 * en a que deux, et c'est la liste des familles admises : un préfixe devant
 * une autre lettre n'a pas de lecture.
 */
export const LARGEURS_IMPLICITES = Object.freeze({
  c: Object.freeze([1, 1]),
  m: Object.freeze([1]),
});

const memesLargeurs = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Lit un code positionnel. Rend `null` si ce n'en est pas un (un code nu, ou
 * n'importe quoi d'autre), `{ raison }` s'il en a la forme mais pas le sens,
 * et sinon `{ position, largeurs, code, ecrit }` — `ecrit` étant l'écriture
 * CANONIQUE, sans les largeurs implicites.
 * @param {string} ecrit
 */
export function lirePositionnel(ecrit) {
  const m = typeof ecrit === 'string' ? RE_POSITIONNEL.exec(ecrit) : null;
  if (!m) return null;
  const position = Number(m[1]);
  const code = m[3];
  const implicites = LARGEURS_IMPLICITES[code[0]];
  if (!implicites) {
    return { raison: `« ${ecrit} » : une position ne se pose que devant un combinateur (c…) ou `
      + 'un mappeur de nombres (m…) — le texte se découpe par les portées' };
  }
  const largeurs = m[2] ? m[2].slice(1).split('.').map(Number) : implicites.slice();
  if (largeurs.some((l) => !Number.isSafeInteger(l) || l < 1)) {
    return { raison: `« ${ecrit} » : une largeur compte au moins un caractère` };
  }
  if (!Number.isSafeInteger(position)) return { raison: `« ${ecrit} » : position illisible` };
  if (code[0] === 'c' && largeurs.length < 2) {
    return { raison: `« ${ecrit} » : un combinateur réunit au moins deux opérandes, donc deux largeurs` };
  }
  if (code[0] === 'm' && largeurs.length !== 1) {
    return { raison: `« ${ecrit} » : un mappeur ne prend qu’une largeur, celle de sa fenêtre` };
  }
  return { position, largeurs, code, ecrit: ecrirePositionnel(position, largeurs, code) };
}

/** L'écriture canonique : les largeurs implicites se taisent. */
export function ecrirePositionnel(position, largeurs, code) {
  const implicites = LARGEURS_IMPLICITES[code[0]];
  const tues = implicites && memesLargeurs(largeurs, implicites);
  return `${position}${tues ? '' : `.${largeurs.join('.')}`}${code}`;
}

/** L'opérateur admet-il un préfixe ? Combinateur `NUMS → NUM`, ou mappeur `NUMS → NUMS`. */
export function localisable(op) {
  if (!op || op.from !== 'NUMS') return false;
  if (op.famille === 'combinateur') return op.to === 'NUM';
  if (op.famille === 'mappeur') return op.to === 'NUMS';
  return false;
}

// ───────────────────────────────────────────────────────────────────────────
// Le découpage — une seule fonction, lue par `apply`, `steps` et `sortie`
// ───────────────────────────────────────────────────────────────────────────

/**
 * Le plan d'une application localisée, ou `{ raison }`.
 *
 * ★ Contrôle croisé (CONTRACTS §0.3) : `apply`, `steps` et `sortie` appellent
 *   tous trois CETTE fonction sur le MÊME vecteur. Il n'existe pas de seconde
 *   copie du découpage qui pourrait montrer une coupe et en calculer une autre.
 *
 * `morceaux` — la ligne coupée à chaque bord (de fenêtre, et entre opérandes
 * pour un combinateur) : `{ texte, src, debut, fin }`, `src` étant l'index du
 * nombre d'où il vient. `operandes` — ce que l'opérateur de base reçoit, chacun
 * `{ texte, morceaux: [indices] }`. `avant` et `apres` — les indices des
 * morceaux laissés hors fenêtre.
 */
function planifier(valeur, position, largeurs, combinateur) {
  if (!Array.isArray(valeur) || !valeur.length) return { raison: 'ligne vide' };
  if (valeur.some((v) => !Number.isSafeInteger(v) || v < 0)) {
    return { raison: `la ligne « ${valeur.join(' ')} » porte un nombre négatif : ses caractères ne se comptent pas` };
  }
  const ecritures = valeur.map(String);
  const total = ecritures.reduce((n, e) => n + e.length, 0);
  const fin = position + largeurs.reduce((a, b) => a + b, 0);
  if (fin > total) {
    return { raison: `la ligne « ${valeur.join(' ')} » compte ${total} caractère(s), la fenêtre `
      + `va du ${position} au ${fin - 1}` };
  }
  // Les bords : début de fenêtre, fin, et chaque frontière d'opérande.
  const bords = new Set([position, fin]);
  if (combinateur) {
    let b = position;
    for (const l of largeurs) { b += l; bords.add(b); }
  }
  const morceaux = [];
  let curseur = 0;
  ecritures.forEach((e, src) => {
    let debut = curseur;
    for (let k = 1; k < e.length; k++) {
      if (bords.has(curseur + k)) {
        morceaux.push({ texte: e.slice(debut - curseur, k), src, debut, fin: curseur + k });
        debut = curseur + k;
      }
    }
    morceaux.push({ texte: e.slice(debut - curseur), src, debut, fin: curseur + e.length });
    curseur += e.length;
  });
  const zeroDeTete = (t) => t.length > 1 && t[0] === '0';
  const fautif = morceaux.find((m) => zeroDeTete(m.texte));
  if (fautif) {
    return { raison: `la coupe laisse « ${fautif.texte} », qui se relirait sans son zéro de tête` };
  }
  const avant = [];
  const dedans = [];
  const apres = [];
  morceaux.forEach((m, i) => {
    if (m.fin <= position) avant.push(i);
    else if (m.debut >= fin) apres.push(i);
    else dedans.push(i);
  });
  let operandes;
  if (combinateur) {
    operandes = [];
    let b = position;
    for (const l of largeurs) {
      const ks = dedans.filter((i) => morceaux[i].debut >= b && morceaux[i].fin <= b + l);
      const texte = ks.map((i) => morceaux[i].texte).join('');
      if (zeroDeTete(texte)) {
        return { raison: `l’opérande « ${texte} » se relirait sans son zéro de tête` };
      }
      operandes.push({ texte, morceaux: ks });
      b += l;
    }
  } else {
    operandes = dedans.map((i) => ({ texte: morceaux[i].texte, morceaux: [i] }));
  }
  const coupes = new Set(morceaux.map((m) => m.src).filter((s, i, t) => t.indexOf(s) !== i));
  return { morceaux, operandes, avant, apres, coupes };
}

// ───────────────────────────────────────────────────────────────────────────
// Les identifiants — nommés une fois, lus par `steps` et `sortie`
// ───────────────────────────────────────────────────────────────────────────

/**
 * Le nom de chaque morceau et de chaque opérande. Un nombre que rien ne coupe
 * GARDE son jeton : aucun geste ne le touche, et le renommer ferait croire à la
 * scène qu'il a été remplacé. Un nombre coupé cède la place à ses morceaux ; un
 * opérande fait de plusieurs morceaux naît de leur collage.
 */
function nommer(plan, ctx) {
  const idsMorceaux = plan.morceaux.map((m, i) => (plan.coupes.has(m.src)
    ? `${ctx.cle}_d${i}` : ctx.ids[m.src]));
  const idsOperandes = plan.operandes.map((o, j) => (o.morceaux.length === 1
    ? idsMorceaux[o.morceaux[0]] : `${ctx.cle}_f${j}`));
  // L'opérateur de base nomme ce qu'il crée sous une clé À LUI : les deux
  // familles de noms ne peuvent pas se rencontrer (`_d`, `_f` d'un côté ;
  // `w_…`, `wop…`, `wi…` de l'autre).
  return { idsMorceaux, idsOperandes, cleBase: `${ctx.cle}w` };
}

const LIB_REDECOUPE = bilingue('On redécoupe les chiffres de la ligne', 'Regroup the digits on the line');

/**
 * ★ **LOCALISE un opérateur.** Rend `{ op }` — l'opérateur dérivé — ou
 * `{ raison }` quand l'opérateur n'admet pas de préfixe. La fenêtre, elle, ne
 * se juge que sur une ligne : c'est `apply` qui refuse une position hors
 * bornes, en rendant `null` comme tout opérateur qui ne s'applique pas, et
 * `pourquoi` qui dit pourquoi.
 *
 * @param {Object} base l'opérateur du catalogue (ou sa version visée)
 * @param {{position:number, largeurs:number[]}} prefixe
 */
export function localiser(base, { position, largeurs }) {
  if (!localisable(base)) {
    return { op: null, raison: `« ${base && base.code} » (${base && base.from} → ${base && base.to}) n’admet pas de `
      + 'position : seuls un combinateur de nombres et un mappeur NUMS → NUMS se localisent' };
  }
  const combinateur = base.famille === 'combinateur';
  const implicites = LARGEURS_IMPLICITES[base.code[0]];
  if (!implicites || (combinateur ? largeurs.length < 2 : largeurs.length !== 1)) {
    return { op: null, raison: `« ${base.code} » : ${largeurs.length} largeur(s), ce qui ne se lit pas pour cette famille` };
  }
  const code = ecrirePositionnel(position, largeurs, base.code);
  const plan = (valeur) => planifier(valeur, position, largeurs, combinateur);

  /** Les deux états que l'opérateur de base voit : sa fenêtre, et ce qu'il en fait. */
  const sousEtats = (p, traces, brut) => {
    const tr = p.operandes.map((o) => fusion(...o.morceaux.map((i) => traces[p.morceaux[i].src] || [])));
    const avant = nums(p.operandes.map((o) => Number(o.texte)), tr);
    const apres = brut && (combinateur
      ? num(brut.valeur, brut.traces && brut.traces[0])
      : nums(brut.valeur, brut.traces));
    return { avant, apres, traces: tr };
  };

  const apply = (valeur, traces) => {
    const p = plan(valeur);
    if (p.raison) return null;
    const { avant: sous, traces: tr } = sousEtats(p, traces || [], null);
    if (!sous) return null;
    const brut = base.apply(sous.valeur, tr);
    if (brut === null || brut === undefined) return null;
    const resultat = combinateur ? [brut.valeur] : brut.valeur;
    const tracesResultat = combinateur
      ? [fusion(brut.traces || tr)]
      : (brut.traces || resultat.map(() => fusion(tr)));
    const hors = (ks) => ks.map((i) => p.morceaux[i]);
    const gauche = hors(p.avant);
    const droite = hors(p.apres);
    return {
      valeur: [...gauche.map((m) => Number(m.texte)), ...resultat, ...droite.map((m) => Number(m.texte))],
      // Un morceau hérite de la trace de son nombre entier : un chiffre de `10`
      // vient des mêmes lettres que `10`, on ne sait pas — et on ne prétend
      // pas savoir — lequel des deux en vient « plus ».
      traces: [
        ...gauche.map((m) => traces[m.src] || []),
        ...tracesResultat,
        ...droite.map((m) => traces[m.src] || []),
      ],
    };
  };

  const pourquoi = (valeur) => {
    const p = plan(valeur);
    return p.raison || null;
  };

  /** Le contexte que l'opérateur de base reçoit : sa fenêtre, sous sa clé. */
  const ctxDeBase = (ctx, noms, sousAvant, sousApres) => ({
    ...ctx,
    ids: noms.idsOperandes,
    cle: noms.cleBase,
    groupes: noms.idsOperandes.map((id) => [id]),
    elements: sousAvant.valeur.map(String),
    cibles: sousApres ? (sousApres.type === 'NUM' ? [String(sousApres.valeur)] : sousApres.valeur.map(String)) : [],
    op: base,
  });

  const sortie = (avant, apres, ctx) => {
    const p = plan(avant.valeur);
    if (p.raison) return ctx.ids;
    const noms = nommer(p, ctx);
    const { avant: sousAvant } = sousEtats(p, tracesDe(avant), null);
    const brut = base.apply(sousAvant.valeur, tracesDe(sousAvant));
    const { apres: sousApres } = sousEtats(p, tracesDe(avant), brut);
    const milieu = base.sortie(sousAvant, sousApres, ctxDeBase(ctx, noms, sousAvant, sousApres));
    return [...p.avant.map((i) => noms.idsMorceaux[i]), ...milieu, ...p.apres.map((i) => noms.idsMorceaux[i])];
  };

  /**
   * ★ **DEUX TEMPS : la ligne se redécoupe, PUIS le geste embrasse la fenêtre.**
   *
   * 1. Le REDÉCOUPAGE, s'il y a quelque chose à redécouper. Un nombre coupé se
   *    scinde (`substitute`, un jeton vers plusieurs — le même geste que le
   *    « chiffre à chiffre » de `mrd`) ; un opérande fait de plusieurs
   *    morceaux se colle (`merge` : les espaces se résorbent, rien d'autre ne
   *    bouge). La coupe se voit AVANT le calcul : une accolade qui
   *    embrasserait le `1` d'un `10` encore entier mentirait sur ce qu'elle
   *    prend.
   * 2. Le GESTE de l'opérateur de base, tel quel, mais sur la fenêtre seule :
   *    ses `ids` sont ceux des opérandes, de sorte que l'accolade de `sum`, le
   *    demi-tour de `flip180` ou le ramassage d'un décompte n'embrassent que
   *    ce qui est sous la fenêtre. Les autres jetons ne sont nommés par aucune
   *    op : ils ne bougent que du réajustement de la ligne, une fois le
   *    résultat posé (`commun.js › retirerAccolade`, et les primitives qui en
   *    suivent la règle). Aucune primitive neuve : celles qui existent
   *    suffisent.
   */
  const steps = (avant, apres, ctx) => {
    const p = plan(avant.valeur);
    if (p.raison) return [];
    const noms = nommer(p, ctx);
    const out = [];
    const scissions = [];
    for (const src of p.coupes) {
      const ks = p.morceaux.map((m, i) => (m.src === src ? i : -1)).filter((i) => i >= 0);
      scissions.push({
        target: ctx.ids[src],
        to: ks.map((i) => token(noms.idsMorceaux[i], p.morceaux[i].texte, 'number')),
      });
    }
    const collages = p.operandes
      .map((o, j) => (o.morceaux.length > 1 ? {
        op: 'merge',
        targets: o.morceaux.map((i) => noms.idsMorceaux[i]),
        to: token(noms.idsOperandes[j], o.texte, 'number'),
      } : null))
      .filter(Boolean);
    if (scissions.length || collages.length) {
      const ligne = [
        ...p.avant.map((i) => p.morceaux[i].texte),
        ...p.operandes.map((o) => o.texte),
        ...p.apres.map((i) => p.morceaux[i].texte),
      ];
      out.push(etape(ctx, dire(LIB_REDECOUPE, ctx.langue), `${avant.valeur.join(' ')} → ${ligne.join(' ')}`,
        enchainer([scissions.length ? { op: 'substitute', pairs: scissions } : null, ...collages]),
        { id: `s_${ctx.cle}_r` }));
    }
    const { avant: sousAvant } = sousEtats(p, tracesDe(avant), null);
    const brut = base.apply(sousAvant.valeur, tracesDe(sousAvant));
    const { apres: sousApres } = sousEtats(p, tracesDe(avant), brut);
    if (!sousApres) return [];
    const emis = base.steps(sousAvant, sousApres, ctxDeBase(ctx, noms, sousAvant, sousApres));
    if (!Array.isArray(emis) || !emis.length) return [];
    out.push(...emis);
    return out;
  };

  // `viser`, `utilite`, `couverture`, `exempleUtile` et `additions` parlent de
  // la ligne ENTIÈRE, ou de la recherche : un opérateur écrit à la main sur une
  // fenêtre n'en a pas l'usage, et les garder les ferait mentir sur un vecteur
  // qu'ils ne voient pas.
  const {
    viser, utilite, couverture, exempleUtile, additions, ...reste
  } = base;
  return {
    op: Object.freeze({
      ...reste,
      code,
      from: 'NUMS',
      to: 'NUMS',
      // Un opérateur localisé ne commute avec rien : `1cs+2cs` et `2cs+1cs`
      // ne désignent pas la même ligne.
      commute: false,
      positionnel: Object.freeze({ position, largeurs: Object.freeze(largeurs.slice()), base: base.code }),
      apply,
      steps,
      sortie,
      pourquoi,
    }),
    raison: null,
  };
}

/**
 * Résout un code écrit — nu ou positionnel — sur une table `code → opérateur`.
 * Rend `{ op }`, ou `{ op: null, raison, inconnu }` : `inconnu` quand c'est le
 * CODE qui manque au catalogue, pour que l'appelant ne confonde pas un
 * opérateur absent avec un préfixe refusé.
 * @param {{get:(code:string)=>Object|undefined}} table
 * @param {string} ecrit
 */
export function resoudreCode(table, ecrit) {
  const nu = table.get(ecrit);
  if (nu) return { op: nu, raison: null, inconnu: false };
  const preuve = lirePreuveCesar(ecrit);
  if (preuve) {
    const base = table.get(preuve.base);
    const op = base?.avecPreuve?.(preuve, table);
    return { op: op || null, raison: null, inconnu: !op };
  }
  const lu = lirePositionnel(ecrit);
  if (!lu) return { op: null, raison: null, inconnu: true };
  if (lu.raison) return { op: null, raison: lu.raison, inconnu: false };
  const base = table.get(lu.code);
  if (!base) return { op: null, raison: null, inconnu: true };
  const r = localiser(base, lu);
  return r.op ? { op: r.op, raison: null, inconnu: false } : { op: null, raison: r.raison, inconnu: false };
}
