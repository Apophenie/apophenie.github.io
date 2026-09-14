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
 * d'accolade. Seule exception, et elle est DÉCLARÉE sur le nœud : le tracé
 * d'une somme, qui s'efface au rythme de ses sources (`suitSesSources`,
 * arbitrage de l'auteur, voir `helpers.js › accumulate`).
 *
 * **Le resserrement** : le départ des déplacements horizontaux des jetons de la
 * ligne de sortie qui durent encore à la fin de l'action. Un élargissement
 * fini avant la fin de l'action — l'espace qui s'ouvre au début du carré — n'en
 * est pas un.
 */

import { DUREE_OP } from '../../moteur/transformations/commun.js';

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
    out.push({ etape: i, id: st.id, action: tAction, effacement: tEff, resserrement: tSerre, duree: st.duration, faute });
  });
  return out;
}
