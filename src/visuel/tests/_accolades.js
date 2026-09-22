/**
 * ★ **LA FIN D'UN GESTE À ACCOLADE — l'œil qui la mesure.**
 *
 * > « Sur les autres opérations, est-ce en 2 temps ou en simultané ? En tout
 * >   cas il faut que le comportement soit cohérent. » (l'autrice)
 *
 * La règle (`primitives/helpers.js › finirSousAccolade`) : l'action sous
 * l'accolade se termine entièrement, PUIS l'accolade s'efface, et la ligne ne
 * se réajuste pas avant que l'accolade ne commence à s'effacer.
 *
 * Partagé par la garde de routine (`fin-des-accolades.test.js`) et par
 * l'inventaire : une seule définition des trois instants.
 *
 * ## Les trois instants, mesurés sur la timeline d'une étape
 *
 * **Les accolades** : les nœuds `bracket` de forme `brace` animés dans
 * l'étape (le soulignement d'un `highlight`, le trait d'une `annotate` ou la
 * barre d'une fraction n'en sont pas). Leurs PIÈCES : le tracé, et ce qui lui
 * est accroché (`data.suit` — symbole, légende).
 *
 * **La fin de l'action** : le dernier mouvement — `translate`, `scale`,
 * `opacity` — d'un jeton de TEXTE qui n'est pas un SURVIVANT de la ligne
 * (présent à l'entrée ET à la sortie de l'étape) : ce qui part, ce qui arrive,
 * les copies en vol. Les cales (texte vide) n'en sont pas ; les déplacements
 * purement horizontaux des jetons de la LIGNE (d'entrée ou de sortie) non plus —
 * c'est la mise en page, pas l'action.
 *
 * ★ **SEULE COMPTE L'ACTION DES OPS OUVERTES AVANT L'EFFACEMENT.** Une étape
 *   enchaîne parfois un geste sans accolade APRÈS celui qui en porte une — la
 *   somme `8 + 8 = 16`, puis `16` écrit chiffre à chiffre. Ce second geste
 *   n'est pas « sous l'accolade » : on borne donc l'action à la fin de la
 *   dernière op de l'étape qui a commencé avant l'effacement.
 *
 * **L'effacement** : le premier départ d'opacité vers 0 d'une pièce
 * d'accolade qui attend la fin — le symbole, la légende, et le tracé s'il est
 * encore là. Le tracé qui SUIT SES SOURCES (`suitSesSources`) peut s'effacer
 * plus tôt : c'est la règle.
 *
 * ★ **LE TRACÉ SUIT SES SOURCES — et c'est son ABSENCE qui est une faute.**
 *
 * > « Je crois que c'est l'exception qui devrait être la règle, donc oui pour
 * >   la garder et même la généraliser ! » (l'autrice)
 *
 * Les sources d'une accolade : les jetons de la ligne d'entrée que son tracé
 * couvre quand il se tire. Quand certaines partent pendant l'action — elles
 * s'effacent, ou quittent la hauteur de la ligne —, et que ce qui reste n'a
 * plus la même étendue (ou qu'il ne reste rien), le tracé doit le montrer
 * dans la foulée : un resserrement (canal `d`) ou son effacement, qui
 * commence après le premier de ces départs et avant la fin de l'action. Un
 * jeton du milieu qui part ne change pas l'étendue : rien n'est exigé.
 *
 * ★ **LE TRACÉ SE REFERME SUR LE RÉSULTAT ARRIVÉ, PUIS S'EFFACE.**
 *
 * Le résultat qui arrive sous l'accolade compte comme « encore là » (la
 * décision de l'autrice). Ses RÉSULTATS : les jetons nouveaux de la ligne de
 * sortie qui se trouvent sous le tracé quand il commence à s'effacer — avec les
 * survivants qui y restent (le diviseur gardé d'un modulo). Quand il y en a :
 * aucun ne doit encore arriver après le début de l'effacement du tracé, et, à
 * cet instant, le tracé les couvre, et eux seuls (à une chasse près de chaque
 * côté). Quand toutes les sources partent et qu'un résultat arrive, c'est cette
 * fermeture qui tient lieu de suivi.
 *
 * ★ **LE RÉSULTAT SE POSE DANS L'ACCOLADE, jamais à côté.**
 *
 * > « L'accolade devrait anticiper le contenu qui arrive : elle désigne
 * >   l'opération en cours, résultat compris, donc la place qui est faite pour
 * >   le résultat est à compter à l'intérieur de l'accolade, pour que le
 * >   résultat vienne se loger dedans plutôt que dehors. » (l'autrice)
 *
 * Pour chaque résultat qui se pose sur la ligne sous une accolade : à
 * l'instant où il se pose, sa boîte est contenue dans l'étendue du tracé (à une
 * chasse près) ; et un instant avant — la moitié de sa pose, 150 ms au plus —,
 * le tracé couvrait DÉJÀ cette place. Un tracé qui court rattraper un résultat
 * posé à côté de lui ne la tient pas.
 *
 * ★ **DESCENDRE SOUS LA POINTE N'EST PAS QUITTER.**
 *
 * « N'embrasse que ce qui est encore là » vise ce qui QUITTE l'accolade
 * (l'autrice). Une expression qui descend D'UN BLOC sous sa pointe — le
 * « 115 × 115 » du carré — ne la quitte pas : le tracé RESTE. On la
 * reconnaît sur la timeline : plusieurs jetons partent au même instant, du
 * même déplacement, et arrivent plus bas que le tracé. Ceux-là ne comptent pas
 * comme partis, et le tracé ne doit ni se resserrer ni s'effacer pendant leur
 * descente. Des opérandes qui descendent UN PAR UN au compteur — ceux d'une
 * somme — la quittent, eux.
 *
 * ★ **UNE PLACE GARDÉE COMPTE COMME « LÀ » — et le yoyo est une faute.**
 *
 * > « L'accolade ne doit pas se réduire quand un espace est gardé. Exemple,
 * >   mab : l'accolade fait du yoyo alors qu'elle pourrait rester stable le
 * >   temps que les 2 ingrédients sont additionnés, puis se réajuster à la
 * >   taille du résultat pour finalement disparaître. » (l'autrice)
 *
 * Le tracé ne bouge qu'aux moments où la LIGNE bouge — un déplacement
 * horizontal d'un de ses jetons, à sa hauteur de ligne. Sur
 * la timeline, pour chaque changement de largeur du tracé (chemin `d`, lu de la
 * largeur dessinée juste avant à celle d'arrivée) :
 *  · AVANT l'arrivée des résultats sous lui (le début de leur remontée), il ne se
 *    RÉDUIT que pendant un mouvement de la ligne — s'étendre, c'est anticiper la
 *    place du résultat ;
 *  · et, hors des mouvements de la ligne, la largeur ne change de sens qu'une
 *    fois sur l'étape, au plus tôt à cette arrivée — le réajustement à la taille
 *    du résultat. Un tracé qui suit une ligne qui se referme PUIS s'écarte (un
 *    signe inséré) fait ce que la ligne fait : ce n'est pas un yoyo.
 * Les mouvements de la ligne : ceux, horizontaux et à leur hauteur de ligne,
 * des jetons qu'elle portait à l'entrée de l'étape.
 * Le suivi des sources n'est donc exigé que si la ligne bouge pendant l'action.
 *
 * **Le resserrement** : le départ des déplacements horizontaux des jetons de la
 * ligne de sortie qui durent encore à la fin de l'action. Un élargissement
 * fini avant la fin de l'action — l'espace qui s'ouvre au début du carré — n'en
 * est pas un.
 */

import { DUREE_OP } from '../../moteur/transformations/commun.js';
import { ACCOLADE } from '../primitives/helpers.js';
import { lecteur } from './_lecteur.js';

/** Unités de temps tolérées : les arrondis de compilation. */
export const TOLERANCE_MS = 1;

/**
 * ★ **DEUX ACCOLADES NE SE SUPERPOSENT JAMAIS — l'œil qui le mesure.**
 *
 * > « Plusieurs accolades qui se chevauchent durant `mrdE` » (l'auteur), et le
 * >   même défaut sur `mrtE`.
 *
 * Une accolade est une AFFIRMATION : « ceci, pris ensemble ». Deux affirmations
 * dessinées l'une sur l'autre n'en font aucune — on ne sait plus laquelle
 * embrasse quoi, ni sous quelle pointe tombera quel résultat. La règle se dit
 * donc en une phrase : à AUCUN instant deux tracés ne partagent un morceau
 * d'écran. Soit leurs plages sont disjointes — c'est le cas ordinaire, les
 * paquets d'un redécoupage se suivent sur la ligne —, soit ils vivent à des
 * hauteurs distinctes, soit ils ne sont pas vivants en même temps.
 *
 * **La boîte d'un tracé** à l'instant t, dans le repère de la scène :
 *  · horizontalement, sa demi-largeur COURANTE — le dernier chemin `d` émis, à
 *    son avancée (le tracé se redessine, il n'est jamais mis à l'échelle) ;
 *  · verticalement, de la naissance de ses bras à sa pointe (`ACCOLADE`), du
 *    côté où il vit (`data.sens`).
 *
 * **Vivant** veut dire : à l'encre (opacité > 0,1) ET déjà tiré — tant que
 * `strokeDashoffset` vaut 100, rien n'est peint. Un tracé à demi tiré compte :
 * ce qu'il a déjà posé est à l'écran.
 *
 * On ne rend que le PIRE recouvrement de chaque paire, pour que le message
 * nomme les coupables une fois chacun plutôt qu'à chaque pas d'horloge.
 *
 * @param {object} tl la timeline compilée
 * @param {number} pas le pas d'échantillonnage, en ms
 * @returns {{t:number, dx:number, dy:number, etape:number, a:string, b:string}[]}
 *   trié du pire au moindre
 */
export function accoladesQuiSeChevauchent(tl, pas = 20) {
  const lire = lecteur(tl);
  const traces = tl.nodes.filter((n) => n.role === 'bracket' && n.data && n.data.shape === 'brace');
  if (traces.length < 2) return [];
  const fin = Math.max(...tl.steps.map((s) => s.t0 + s.duration));
  const etapeA = (t) => tl.steps.findIndex((s) => t >= s.t0 && t < s.t0 + s.duration);

  // La demi-largeur dessinée à l'instant t : le dernier chemin émis, à son avancée.
  const demiLargeur = (n, t) => {
    const emis = tl.discrete.filter((r) => r.id === n.id && r.channel === 'd' && r.at <= t)
      .sort((x, y) => x.at - y.at);
    const r = emis.length ? emis[emis.length - 1] : null;
    const chemin = r ? r.render(r.dur ? Math.min(1, Math.max(0, (t - r.at) / r.dur)) : 1) : n.data.d;
    const m = /^M\s*(-?[\d.]+)/.exec(String(chemin || ''));
    return m ? Math.abs(Number(m[1])) : null;
  };

  const pires = new Map();
  for (let t = 0; t <= fin; t += pas) {
    const vus = [];
    for (const n of traces) {
      if (!((lire.valeur(n.id, 'opacity', t) ?? 1) > 0.1)) continue;
      const tire = lire.valeur(n.id, 'strokeDashoffset', t);
      if (tire !== undefined && tire >= 100) continue;
      const p = lire.valeur(n.id, 'translate', t);
      const demi = demiLargeur(n, t);
      if (!p || demi === null) continue;
      const s = (n.data.sens ?? 1) < 0 ? -1 : 1;
      vus.push({
        id: n.id,
        g: p.x - demi,
        d: p.x + demi,
        haut: s > 0 ? p.y - ACCOLADE.bras : p.y - ACCOLADE.pointe,
        bas: s > 0 ? p.y + ACCOLADE.pointe : p.y + ACCOLADE.bras,
      });
    }
    for (let i = 0; i < vus.length; i++) {
      for (let j = i + 1; j < vus.length; j++) {
        const a = vus[i];
        const b = vus[j];
        const dx = Math.min(a.d, b.d) - Math.max(a.g, b.g);
        const dy = Math.min(a.bas, b.bas) - Math.max(a.haut, b.haut);
        if (dx <= 0.5 || dy <= 0.5) continue;
        const cle = `${a.id}|${b.id}`;
        const vu = pires.get(cle);
        if (!vu || dx > vu.dx) {
          pires.set(cle, { t: Math.round(t), dx, dy, etape: etapeA(t), a: a.id, b: b.id });
        }
      }
    }
  }
  return [...pires.values()].sort((x, y) => y.dx - x.dx);
}

/**
 * Les fins de toutes les étapes à accolade d'une scène compilée.
 *
 * @param {object} tl        la timeline compilée
 * @param {string[][]} lignes le flux à l'entrée de chaque étape, puis le flux final
 *   (`_cadre.js › compilerEnRelevant`)
 * @returns {{etape:number, id:string, action:?number, effacement:?number,
 *            resserrement:?number, faute:?string}[]}
 */
export function finsDesAccolades(tl, lignes) {
  const noeuds = new Map(tl.nodes.map((n) => [n.id, n]));
  const lire = lecteur(tl);
  const out = [];
  tl.steps.forEach((st, i) => {
    const t0 = st.t0;
    const t1 = st.t0 + st.duration;
    const dans = (a) => a.delay >= t0 - 0.5 && a.delay < t1 - 0.5;
    const anims = tl.anims.filter(dans);
    const accolades = tl.nodes.filter((n) => n.role === 'bracket' && n.data && n.data.shape === 'brace'
      && anims.some((a) => a.id === n.id));
    if (!accolades.length) return;
    const pieces = new Set();
    for (const a of accolades) {
      pieces.add(a.id);
      for (const n of tl.nodes) if (n.data && n.data.suit === a.id) pieces.add(n.id);
    }
    const entree = new Set(lignes[i] || []);
    const sortie = new Set(lignes[i + 1] || []);
    const survivant = (id) => entree.has(id) && sortie.has(id);
    const texte = (id) => {
      const n = noeuds.get(id);
      return n && n.role === 'text' && typeof n.text === 'string' && n.text.trim() !== '';
    };
    const fin = (a) => a.delay + a.duration - t0;
    const debut = (a) => a.delay - t0;
    const depart = (a) => a.keyframes[0].value;
    const arrivee = (a) => a.keyframes[a.keyframes.length - 1].value;
    const horizontal = (a) => a.prop === 'translate' && a.keyframes.every((k) => Math.abs(k.value.y - depart(a).y) < 0.5);

    const effacements = anims.filter((a) => pieces.has(a.id) && a.prop === 'opacity' && arrivee(a) === 0
      && !(noeuds.get(a.id).data && noeuds.get(a.id).data.suitSesSources));
    const tEff = effacements.length ? Math.min(...effacements.map(debut)) : null;

    // La fenêtre de l'action : jusqu'au DÉBUT de la première op qui s'ouvre après
    // l'effacement (toute l'étape s'il n'y en a pas). On ne borne pas par la
    // durée DÉCLARÉE des ops ouvertes avant : une op peut animer au-delà (la
    // potence), et sa fin aurait échappé à la mesure — mesuré, elle passait.
    // Les instants déclarés sont ceux du scénario : une étape accélérée (redite)
    // les joue `st.speed` fois plus vite, comme `compile.js › scale`.
    const vitesse = st.speed || 1;
    const debuts = ((tl.scenario && tl.scenario.steps && tl.scenario.steps[i] && tl.scenario.steps[i].ops) || [])
      .map((o) => (o.at || 0) / vitesse);
    const suivantes = tEff === null ? [] : debuts.filter((d) => d >= tEff - TOLERANCE_MS);
    const borne = suivantes.length ? Math.min(...suivantes) : Infinity;

    const ligne = (id) => entree.has(id) || sortie.has(id);
    // Un décor ACCROCHÉ à un jeton de la ligne (`data.suit` — l'exposant suspendu
    // d'une puissance, le « ! » d'une factorielle, un halo) suit sa mise en page :
    // quand la ligne se referme, il glisse avec son jeton, et ce n'est pas l'action.
    const accroche = (id) => {
      const n = noeuds.get(id);
      return Boolean(n && n.data && typeof n.data.suit === 'string' && ligne(n.data.suit));
    };
    const action = anims.filter((a) => texte(a.id) && !pieces.has(a.id) && !survivant(a.id)
      && ['translate', 'scale', 'opacity'].includes(a.prop)
      && debut(a) < borne - TOLERANCE_MS
      && !((ligne(a.id) || accroche(a.id)) && horizontal(a)));
    const tAction = action.length ? Math.max(...action.map(fin)) : null;

    const serre = tAction === null ? [] : anims.filter((a) => ligne(a.id) && texte(a.id) && horizontal(a)
      && debut(a) < borne - TOLERANCE_MS
      && fin(a) > tAction + TOLERANCE_MS);
    const tSerre = serre.length ? Math.min(...serre.map(debut)) : null;

    const av = tl.metrics.advance;
    const nouveaux = [...sortie].filter((id) => !entree.has(id) && texte(id));
    const couvreAuFondu = (acc, ids, t) => ids.filter((id) => {
      const base = acc.base && acc.base.translate;
      const p = lire.valeur(id, 'translate', t);
      return base && p && p.x >= base.x - acc.w / 2 && p.x <= base.x + acc.w / 2;
    });
    // Un résultat SOUS l'accolade est animé par les ops ouvertes avant son
    // effacement : ce qu'une op suivante écrit ensuite (le relevé d'identité de
    // `meg`, le « 16 → 1 6 » après une somme) n'en est pas un.
    const sousLAccolade = (id) => anims.some((a) => a.id === id && debut(a) < borne - TOLERANCE_MS);
    const resultatsSous = (acc, t) => couvreAuFondu(acc, nouveaux, t).filter(sousLAccolade);
    const fonduDuTrace = (acc) => {
      const f = anims.filter((a) => a.id === acc.id && a.prop === 'opacity' && arrivee(a) === 0);
      return f.length ? Math.min(...f.map((a) => a.delay)) : null;
    };

    // La demi-largeur du tracé à l'instant t : le dernier chemin émis, à son avancée.
    const demiLargeurA = (acc, t) => {
      const chemins = tl.discrete.filter((r) => r.id === acc.id && r.channel === 'd' && r.at <= t)
        .sort((x, y) => x.at - y.at);
      const r = chemins.length ? chemins[chemins.length - 1] : null;
      const chemin = r ? r.render(r.dur ? Math.min(1, Math.max(0, (t - r.at) / r.dur)) : 1) : (acc.data && acc.data.d);
      const m = /^M\s*(-?[\d.]+)/.exec(String(chemin || ''));
      return m ? Math.abs(Number(m[1])) : null;
    };
    // Les mouvements de la LIGNE : les déplacements horizontaux, À LEUR HAUTEUR DE
    // LIGNE, des jetons qu'elle portait à l'entrée de l'étape. Ni des exemplaires
    // qui convergent en l'air, ni d'un résultat nouveau qui se centre dans sa
    // place, ni des cales invisibles qui se répartissent autour de lui : la ligne,
    // elle, ne bouge pas. (Une place qui s'ouvre sans voisin à pousser ne fait
    // qu'étendre le tracé, ce qui est permis.)
    const hauteurDeLigne = (id) => (lire.valeur(id, 'translate', t0) || {}).y;
    const mouvementsDeLaLigne = anims.filter((a) => a.prop === 'translate' && horizontal(a)
      && Math.abs(arrivee(a).x - depart(a).x) > 0.5
      && entree.has(a.id) && texte(a.id) && Math.abs(depart(a).y - hauteurDeLigne(a.id)) < 1);
    const laLigneBouge = (t, d) => mouvementsDeLaLigne.some((a) => a.delay < t + d - TOLERANCE_MS
      && a.delay + a.duration > t + TOLERANCE_MS);

    // ── Le tracé suit-il ses sources ? ───────────────────────────────────────
    let suiviManquant = null;
    if (tAction !== null) {
      for (const acc of accolades) {
        const trace = anims.filter((a) => a.id === acc.id && a.prop === 'strokeDashoffset')[0];
        const tTire = trace ? trace.delay : t0;
        const base = acc.base && acc.base.translate;
        if (!base) continue;
        const g = base.x - acc.w / 2 - 1;
        const d = base.x + acc.w / 2 + 1;
        // Ses sources : ce qui est VISIBLE sous son tracé quand il se tire. Un jeton
        // déjà parti — les opérandes d'une somme posés sous la pointe, avant que
        // l'accolade suivante de la même étape ne se tire au même endroit — n'en est
        // pas une.
        const couverts = [...entree].filter((id) => {
          if (!texte(id)) return false;
          if (!((lire.valeur(id, 'opacity', tTire) ?? 1) > 0.1)) return false;
          const p = lire.valeur(id, 'translate', tTire);
          return p && p.x >= g && p.x <= d;
        });
        if (!couverts.length) continue;
        const departDe = (id) => {
          const yLigne = lire.valeur(id, 'translate', tTire).y;
          const d0 = anims.filter((a) => a.id === id && a.delay >= tTire - TOLERANCE_MS && (
            (a.prop === 'opacity' && arrivee(a) < 0.1)
            || (a.prop === 'translate' && a.keyframes.some((k) => Math.abs(k.value.y - yLigne) > 1))));
          return d0.length ? Math.min(...d0.map(debut)) : null;
        };
        const limite = tEff === null ? tAction : Math.min(tEff, tAction);
        // Une descente D'UN BLOC sous la pointe : même instant, même déplacement,
        // plusieurs jetons, et une arrivée plus basse que le tracé.
        const blocDe = (id) => {
          const yLigne = lire.valeur(id, 'translate', tTire).y;
          const a = anims.find((x) => x.id === id && x.prop === 'translate' && x.delay >= tTire - TOLERANCE_MS
            && arrivee(x).y > yLigne + 1);
          if (!a || !(arrivee(a).y > base.y)) return null;
          const dx = arrivee(a).x - a.keyframes[0].value.x;
          const dy = arrivee(a).y - a.keyframes[0].value.y;
          const freres = anims.filter((x) => x.id !== id && x.prop === 'translate' && texte(x.id)
            && Math.abs(x.delay - a.delay) < 1
            && Math.abs((arrivee(x).x - x.keyframes[0].value.x) - dx) < 1
            && Math.abs((arrivee(x).y - x.keyframes[0].value.y) - dy) < 1);
          return freres.length ? a : null;
        };
        const descentes = couverts.filter((id) => !sortie.has(id)).map((id) => blocDe(id)).filter(Boolean);
        for (const a of descentes) {
          const bouge = tl.discrete.some((r) => r.id === acc.id && r.channel === 'd'
            && r.at >= a.delay - 50 && r.at < a.delay + a.duration)
            || tl.anims.some((x) => x.id === acc.id && x.prop === 'opacity' && arrivee(x) === 0
              && x.delay >= a.delay - 50 && x.delay < a.delay + a.duration);
          if (bouge) {
            suiviManquant = `le tracé s’efface ou se resserre à ${Math.round(a.delay - t0)} ms, alors que l’expression `
              + 'descend d’un bloc SOUS sa pointe : elle ne quitte pas l’accolade';
          }
        }
        if (suiviManquant) break;
        const enBloc = new Set(couverts.filter((id) => blocDe(id)));
        const partis = couverts.filter((id) => !sortie.has(id) && !enBloc.has(id))
          .map((id) => ({ id, t: departDe(id) }))
          .filter((x) => x.t !== null && x.t < limite - TOLERANCE_MS);
        if (!partis.length) continue;
        const xDe = (id) => lire.valeur(id, 'translate', tTire).x;
        const partisIds = new Set(partis.map((x) => x.id));
        const restent = couverts.filter((id) => !partisIds.has(id));
        const etendue = (ids) => (ids.length ? [Math.min(...ids.map(xDe)), Math.max(...ids.map(xDe))] : null);
        const avant = etendue(couverts);
        const apres = etendue(restent);
        const change = !apres || Math.abs(apres[0] - avant[0]) > 1 || Math.abs(apres[1] - avant[1]) > 1;
        if (!change) continue;
        // Toutes les sources parties, un résultat arrive : c'est la fermeture sur
        // lui qui tient lieu de suivi (vérifiée plus bas).
        // Toutes les sources s'en vont — y compris celles qui restent encore un
        // moment — et un résultat arrive : c'est la fermeture sur lui qui tient
        // lieu de suivi (la potence : A et B disparaissent, le quotient vient).
        const tF = fonduDuTrace(acc);
        const toutesParties = couverts.every((id) => !sortie.has(id));
        if (toutesParties && tF !== null && resultatsSous(acc, tF).length) continue;
        const premier = Math.min(...partis.map((x) => x.t));
        // ★ Une place gardée compte comme « là » (l'autrice) : tant que la ligne ne
        //   bouge pas, le tracé reste stable. Le suivi n'est dû que si la ligne se
        //   referme VRAIMENT pendant l'action.
        if (!laLigneBouge(t0 + premier, tAction - premier)) continue;
        const suit =tl.discrete.some((r) => r.id === acc.id && r.channel === 'd'
          && r.at - t0 >= premier - 50 && r.at - t0 < tAction)
          || tl.anims.some((a) => a.id === acc.id && a.prop === 'opacity' && arrivee(a) === 0
            && debut(a) >= premier - 50 && debut(a) < tAction);
        if (!suit) {
          suiviManquant = `le tracé ne suit pas ses sources : ${partis.length} jeton(s) partent dès ${Math.round(premier)} ms, `
            + 'et il garde leur place';
          break;
        }
      }
    }

    // ── Se referme-t-il sur le résultat arrivé ? ────────────────────────────
    let fermetureManquee = null;
    for (const acc of accolades) {
      if (tAction === null) break;
      const tF = fonduDuTrace(acc);
      if (tF === null) continue;
      const resultats = resultatsSous(acc, tF);
      if (!resultats.length) continue;
      const survivants = couvreAuFondu(acc, [...sortie].filter((id) => entree.has(id) && texte(id)), tF);
      const arrive = (a) => (a.prop === 'translate' && Math.abs(arrivee(a).y - a.keyframes[0].value.y) > 1)
        || (a.prop === 'opacity' && arrivee(a) >= 0.9);
      const tardives = resultats.flatMap((id) => anims.filter((a) => a.id === id && arrive(a)
        && a.delay + a.duration > tF + TOLERANCE_MS));
      if (tardives.length) {
        fermetureManquee = `le tracé s’efface à ${Math.round(tF - t0)} ms, avant que le résultat ne soit arrivé`;
        break;
      }
      const chemins = tl.discrete.filter((r) => r.id === acc.id && r.channel === 'd' && r.at <= tF + TOLERANCE_MS)
        .sort((x, y) => x.at - y.at);
      // Le tracé tel qu'il est À L'INSTANT de l'effacement : un suivi qui commence à
      // cet instant (la ligne qui se referme) n'a pas encore bougé.
      const dernier = chemins.length ? chemins[chemins.length - 1] : null;
      const avance = dernier && dernier.dur ? Math.min(1, Math.max(0, (tF - dernier.at) / dernier.dur)) : 1;
      const chemin = dernier ? dernier.render(avance) : (acc.data && acc.data.d);
      const m = /^M\s*(-?[\d.]+)/.exec(String(chemin || ''));
      if (!m) continue;
      const demi = Math.abs(Number(m[1]));
      const pT = lire.valeur(acc.id, 'translate', tF);
      const boites = [...resultats, ...survivants].map((id) => {
        const p = lire.valeur(id, 'translate', tF);
        const w = noeuds.get(id).w;
        return [p.x - w / 2, p.x + w / 2];
      });
      const gR = Math.min(...boites.map((b) => b[0]));
      const dR = Math.max(...boites.map((b) => b[1]));
      const gT = pT.x - demi;
      const dT = pT.x + demi;
      if (gT > gR + 1 || dT < dR - 1 || (dT - gT) > (dR - gR) + 2 * av) {
        fermetureManquee = `le tracé ne se referme pas sur le résultat avant de s’effacer : il couvre `
          + `${Math.round(dT - gT)} unités pour un résultat de ${Math.round(dR - gR)}`;
        break;
      }
    }

    // ── Le résultat se pose-t-il DANS le tracé ? ─────────────────────────────
    let logementManque = null;
    for (const id of tAction === null ? [] : nouveaux) {
      if (!sousLAccolade(id)) continue;
      const yFinal = (lire.valeur(id, 'translate', t1 - 0.5) || {}).y;
      if (yFinal === undefined) continue;
      const poses = anims.filter((a) => a.id === id && debut(a) < borne - TOLERANCE_MS && (
        (a.prop === 'translate' && Math.abs(arrivee(a).y - a.keyframes[0].value.y) > 1 && Math.abs(arrivee(a).y - yFinal) < 1)
        || (a.prop === 'opacity' && arrivee(a) >= 0.9)));
      if (!poses.length) continue;
      const pose = poses.reduce((m, a) => (a.delay + a.duration > m.delay + m.duration ? a : m));
      const tPose = pose.delay + pose.duration;
      const p = lire.valeur(id, 'translate', tPose);
      const w = noeuds.get(id).w;
      const acc = accolades.find((a) => {
        const base = a.base && a.base.translate;
        return base && p && p.x >= base.x - a.w / 2 && p.x <= base.x + a.w / 2
          && (lire.valeur(a.id, 'opacity', tPose) ?? 1) > 0.1;
      });
      if (!acc) continue;
      const couvre = (t) => {
        const c = lire.valeur(acc.id, 'translate', t);
        const demi = demiLargeurA(acc, t);
        return c && demi !== null && c.x - demi <= p.x - w / 2 + av && c.x + demi >= p.x + w / 2 - av;
      };
      const instantAvant = tPose - Math.min(150, pose.duration * 0.5);
      if (!couvre(tPose)) {
        logementManque = `« ${noeuds.get(id).text} » se pose à ${Math.round(tPose - t0)} ms HORS du tracé de l’accolade`;
        break;
      }
      if (!couvre(instantAvant)) {
        logementManque = `le tracé ne couvrait pas la place de « ${noeuds.get(id).text} » un instant avant qu’il s’y pose `
          + `(${Math.round(tPose - t0)} ms) : il court le rattraper`;
        break;
      }
    }

    // ── La largeur du tracé : stable tant que la ligne ne bouge pas ─────────
    let yoyo = null;
    for (const acc of tAction === null ? [] : accolades) {
      const base = acc.base && acc.base.translate;
      // L'arrivée des résultats sous CE tracé : le début de leur dernière remontée.
      const arrivees = nouveaux.filter(sousLAccolade).map((id) => {
        const yFinal = (lire.valeur(id, 'translate', t1 - 0.5) || {}).y;
        if (yFinal === undefined) return null;
        const poses = anims.filter((a) => a.id === id && debut(a) < borne - TOLERANCE_MS && a.prop === 'translate'
          && Math.abs(arrivee(a).y - a.keyframes[0].value.y) > 1 && Math.abs(arrivee(a).y - yFinal) < 1);
        if (!poses.length) return null;
        const pose = poses.reduce((m, a) => (a.delay + a.duration > m.delay + m.duration ? a : m));
        const p = arrivee(pose);
        return base && p.x >= base.x - acc.w / 2 - 2 * av && p.x <= base.x + acc.w / 2 + 2 * av ? pose.delay : null;
      }).filter((x) => x !== null);
      const tArrivee = arrivees.length ? Math.min(...arrivees) : t0 + tAction;
      const chemins = tl.discrete.filter((r) => r.id === acc.id && r.channel === 'd' && r.at >= t0 - 0.5 && r.at < t1 - 0.5)
        .sort((x, y) => x.at - y.at);
      let sens = 0;
      let retourne = false;
      for (const r of chemins) {
        const avant = demiLargeurA(acc, r.at - 0.01);
        const m = /^M\s*(-?[\d.]+)/.exec(String(r.render(1) || ''));
        if (avant === null || !m) continue;
        const delta = 2 * (Math.abs(Number(m[1])) - avant);
        if (Math.abs(delta) <= 1) continue;
        const s = Math.sign(delta);
        const quoi = `${Math.round(2 * avant)} → ${Math.round(2 * avant + delta)} à ${Math.round(r.at - t0)} ms`;
        // S'étendre avant l'arrivée, c'est anticiper la place du résultat (la règle) ;
        // se RÉDUIRE sur une ligne immobile, c'est oublier la place gardée.
        if (s < 0 && r.at < tArrivee - TOLERANCE_MS && !laLigneBouge(r.at, r.dur)) {
          yoyo = `le tracé se réduit (${quoi}) alors que la ligne ne bouge pas : une place gardée compte comme « là »`;
          break;
        }
        // Un changement de sens qui SUIT la ligne (elle se referme, puis s'écarte
        // pour un signe) n'est pas un yoyo : le tracé fait ce que la ligne fait.
        if (sens && s !== sens && !laLigneBouge(r.at, r.dur)) {
          if (retourne || r.at < tArrivee - TOLERANCE_MS) {
            yoyo = `le tracé fait du yoyo (${quoi}) : sa largeur change de sens avant le réajustement final`;
            break;
          }
          retourne = true;
        }
        sens = s;
      }
      if (yoyo) break;
    }

    let faute = null;
    if (tAction === null) {
      faute = null; // rien ne se passe sous l'accolade : il n'y a pas de fin à ordonner
    } else if (tEff === null) {
      // Une accolade qui ne s'efface pas dans l'étape : elle survit à ce qu'elle désignait.
      const visible = [...pieces].some((id) => {
        const n = noeuds.get(id);
        if (n.data && n.data.suitSesSources) return false;
        const fondus = tl.anims.filter((a) => a.id === id && a.prop === 'opacity' && a.delay < t1);
        const dernier = fondus.sort((x, y) => x.delay - y.delay).at(-1);
        return dernier ? arrivee(dernier) > 0.1 : (n.base.opacity ?? 1) > 0.1;
      });
      if (visible) faute = 'l’accolade ne s’efface pas dans son étape';
    } else if (tEff + TOLERANCE_MS < tAction) {
      faute = `l’accolade s’efface à ${Math.round(tEff)} ms, avant la fin de l’action (${Math.round(tAction)} ms)`;
    } else if (tSerre !== null && tSerre + TOLERANCE_MS < tEff) {
      faute = `la ligne se resserre à ${Math.round(tSerre)} ms, avant l’effacement de l’accolade (${Math.round(tEff)} ms)`;
    }
    if (!faute && suiviManquant) faute = suiviManquant;
    if (!faute && fermetureManquee) faute = fermetureManquee;
    if (!faute && logementManque) faute = logementManque;
    if (!faute && yoyo) faute = yoyo;
    out.push({ etape: i, id: st.id, action: tAction, effacement: tEff, resserrement: tSerre, duree: st.duration, faute });
  });
  return out;
}
