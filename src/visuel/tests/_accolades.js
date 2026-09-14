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
 * **Le resserrement** : le départ des déplacements horizontaux des jetons de la
 * ligne de sortie qui durent encore à la fin de l'action. Un élargissement
 * fini avant la fin de l'action — l'espace qui s'ouvre au début du carré — n'en
 * est pas un.
 */

import { DUREE_OP } from '../../moteur/transformations/commun.js';
import { lecteur } from './_lecteur.js';

/** Unités de temps tolérées : les arrondis de compilation. */
export const TOLERANCE_MS = 1;

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
        const premier = Math.min(...partis.map((x) => x.t));
        const suit = tl.discrete.some((r) => r.id === acc.id && r.channel === 'd'
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
    out.push({ etape: i, id: st.id, action: tAction, effacement: tEff, resserrement: tSerre, duree: st.duration, faute });
  });
  return out;
}
