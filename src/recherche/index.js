// src/recherche/index.js
// Point d'entrée du moteur de recherche heuristique.
// Assemble bfs + bassin + fragments + assemblage + score + scenario + url.
//
// L'interface `postMessage` est prévue dès maintenant (CONTRACTS.md §0.4) mais
// l'exécution est INLINE en v1 : la mesure donne 1,2 ms en moyenne et 48 ms au
// pire pour une fermeture complète, le budget d'une seconde est tenu 20×.
// Passer au Worker se fera sans refondre l'appelant : même protocole de message.

import { LIMITE_SAISIE, encoderTexte } from './base58.js';
import {
  chercherSix, normaliserCatalogue, validerCatalogue, operateursExplorables,
  appliquerOp, etat, N_FRAG_MAX, BUDGET_MS_FILET, BUDGET_TOTAL_MS, FRAGMENTS_GARANTIS,
  BUDGET_TRAVAIL, BUDGET_TRAVAIL_TOTAL, BUDGET_TRAVAIL_RESERVE,
} from './bfs.js';
import { construireBassin } from './bassin.js';
import { genererFragments, zonesSignifiantes, tokeniser, motifsRepetes } from './fragments.js';
import {
  assembler, approcheJoker, deduireMode, normaliserChemins, verdictDe,
} from './assemblage.js';
import { noter, diversifier, ordreTotal, REGLAGES } from './score.js';
import { construireScenario } from './scenario.js';
import { titreApproche, regleApproche, titreBilingue, regleBilingue, nommer } from './titres.js';
import { lire, ecrire, descripteursDe, BANDEAUX } from './url.js';

export { LIMITE_SAISIE, BANDEAUX, REGLAGES };

/**
 * Réponses écrites à la main — CONTRACTS.md §0.4.
 * « Le site échouant à prouver que 666 vaut 666 est un cadeau comique. »
 */
export const REPONSES_DEDIEES = new Map([
  ['666', {
    titre: 'Nous avons vérifié : 666 ne vaut pas 666.',
    texte: 'Le moteur a exploré la totalité des chemins et n’est pas parvenu à démontrer '
      + 'que 666 vaut 666. C’est mathématiquement vexant et, admettons-le, parfaitement '
      + 'dans le ton de la maison. Nous vous proposons tout de même une démonstration de secours.',
    ton: 'aveu',
  }],
  ['6', {
    titre: 'Six vaut six. Il vous en manque deux.',
    texte: 'Nous ne nous abaisserons pas à démontrer l’évidence. Revenez avec un mot, '
      + 'une phrase, une adresse — quelque chose qui résiste un peu.',
    ton: 'hautain',
  }],
  ['diable', {
    titre: 'Le diable, lui, n’a pas eu besoin de nous.',
    texte: 'Six lettres. Vous l’avez écrit vous-même, en toutes lettres, sans aide. '
      + 'La numérologie n’a rien à ajouter : elle constate.',
    ton: 'constat',
  }],
  ['satan', {
    titre: 'Satan : cinq lettres. Une de moins que le diable.',
    texte: 'C’est tout le drame de l’onomastique infernale. Nous vous laissons méditer '
      + 'l’écart, puis nous vous démontrons quand même le 666.',
    ton: 'pince-sans-rire',
  }],
]);

/**
 * Catalogues chargeables, énumérés un par un.
 *
 * Le chargement reste paresseux — le catalogue n'est lu que si on le demande —
 * mais le spécificateur est désormais **littéral**, donc analysable : un
 * `import(variable)` est indéchiffrable pour un empaqueteur, qui ne peut ni
 * suivre la dépendance ni la faire entrer dans le fichier unique dont la
 * version `file://` a besoin. La table de correspondance dit la même chose en
 * restant lisible des deux côtés.
 */
const CATALOGUES = {
  '../moteur/catalogue.js': () => import('../moteur/catalogue.js'),
};

/**
 * Charge le catalogue réel (`src/moteur/catalogue.js`, écrit par l'agent
 * arithmétique). Échec bruyant si absent : pas de dégradation silencieuse.
 * @returns {Promise<Object>}
 */
export async function chargerCatalogue(specificateur = '../moteur/catalogue.js') {
  const charger = CATALOGUES[specificateur];
  if (!charger) throw new Error(`catalogue « ${specificateur} » hors du registre de src/recherche/index.js`);
  const mod = await charger();
  return mod.CATALOGUE || mod.catalogue || mod.default || mod;
}

/**
 * @param {Object} catalogue
 * @param {{valider?:boolean, plageBassin?:Object, maintenant?:()=>number,
 *   filetTemporel?:boolean}} [options]
 *
 * ★ `filetTemporel: false` débranche l'arrêt d'urgence à l'horloge — la
 *   DERNIÈRE source d'entropie du moteur (`bfs.js`, en-tête). Deux usages, et
 *   deux seulement : le banc de mesure et les tests qui comparent deux
 *   classements. Sans lui, un barème avant/après se compare sur une base qui
 *   bouge avec la charge de la machine, ce qui ne veut rien dire. C'est une
 *   option EXPLICITE : l'appelant qui ne demande rien garde son filet.
 */
export function creerMoteur(catalogue, options = {}) {
  if (options.valider !== false) {
    const pbs = validerCatalogue(catalogue);
    if (pbs.length) throw new Error('catalogue non conforme (CONTRACTS §2.2) :\n  - ' + pbs.join('\n  - '));
  }
  const ops = normaliserCatalogue(catalogue);
  const bassin = construireBassin(catalogue, options.plageBassin);
  const cache = new Map();
  const maintenant = options.maintenant || (() => performance.now());

  const contexteBase = () => ({
    catalogue,
    operateurs: operateursExplorables(catalogue),
    bassin,
    cache,
    maintenant,
    dMax: options.dMax,
    pBeam: options.pBeam,
    maxNodes: options.maxNodes,
    maxTravail: options.maxTravail,
    budgetMs: options.budgetMs,
    filetTemporel: options.filetTemporel,
  });

  /**
   * Pipeline complet. Ne rend JAMAIS la main bredouille (§5).
   * @param {string} saisieBrute
   */
  function resoudre(saisieBrute) {
    const saisie = String(saisieBrute ?? '').normalize('NFC'); // §4.4 règle 5
    if (!saisie.length) {
      return { saisie, approches: [], fragments: [], dedie: null, vide: true };
    }
    if (saisie.length > LIMITE_SAISIE) {
      return {
        saisie: saisie.slice(0, LIMITE_SAISIE),
        approches: [], fragments: [], dedie: null, vide: false,
        avertissement: BANDEAUX.saisieTropLongue,
      };
    }

    const dedie = REPONSES_DEDIEES.get(saisie.toLowerCase().trim()) || null;
    const ctxRecherche = contexteBase();
    const signifiants = zonesSignifiantes(saisie);
    const jetons = tokeniser(saisie);
    const frags = genererFragments(saisie, { max: options.nFragMax ?? N_FRAG_MAX });

    // ── phase de recherche, sous budget GLOBAL (research §2.6, repli 5).
    // L'ordre de recherche n'est pas celui d'affichage : le fragment « saisie
    // entière » porte à lui seul les modes DIRECT et TRIPLEMENT, il passe donc
    // juste après les répétitions, avant les unités. Quand le budget s'épuise,
    // ce sont les fragments de queue — n-grammes, mots surnuméraires — qui
    // sautent, jamais ceux qui portent l'assemblage.
    //
    // ── Ce qui borne la phase est le TRAVAIL, pas le temps (§4.4 règle 4).
    // La borne primaire est un budget d'applications d'opérateurs réparti entre
    // les fragments : elle ne dépend que de la saisie, donc deux machines — ou
    // la même machine à deux moments — explorent exactement le même ensemble.
    // Le budget de temps ne subsiste qu'en FILET DE SÉCURITÉ : il ne doit
    // jamais se déclencher dans les cas normaux, et quand il se déclenche le
    // résultat part marqué `tronque` plutôt que de varier en silence.
    const parFrag = new Map();
    // ★ Débranché, le filet ne LIT même pas l'horloge (voir `bfs.js`).
    const filetTemporel = options.filetTemporel !== false;
    const debutRecherche = filetTemporel ? maintenant() : 0;
    const budgetTotal = options.budgetTotalMs ?? BUDGET_TOTAL_MS;
    const travailTotal = options.budgetTravailTotal ?? BUDGET_TRAVAIL_TOTAL;
    let cherches = 0;
    let travailRestant = travailTotal;
    let tronqueTravail = false;  // borne déterministe atteinte : reproductible
    let tronqueTemps = false;    // filet de sécurité : à signaler à l'utilisateur
    for (const f of ordreDeRecherche(frags)) {
      const cle = f.texte.normalize('NFC');
      if (parFrag.has(cle)) continue;
      const epuise = travailRestant <= 0;
      if (epuise && cherches >= FRAGMENTS_GARANTIS) { tronqueTravail = true; break; }
      // Le filet, lui, ne connaît pas de fragment garanti : c'est un arrêt
      // d'urgence, il doit pouvoir arrêter. Un seul fragment est cherché
      // inconditionnellement, faute de quoi `resoudre` pourrait rendre la main
      // sans avoir rien cherché du tout.
      if (filetTemporel && cherches >= 1 && maintenant() - debutRecherche > budgetTotal) {
        tronqueTemps = true;
        break;
      }
      // Le plafond du fragment ne prend que DEUX valeurs, jamais un reliquat de
      // budget : le régime normal, et la réserve une fois le budget global
      // épuisé. Un fragment garanti cherché après épuisement n'a droit qu'à la
      // réserve — sans quoi le plancher des douze perce le budget (mesuré :
      // douze mots de quarante caractères, 1 450 ms). Deux valeurs discrètes
      // et non un reliquat continu, parce que `chercherSix` mémoïse par
      // (fragment, plafond) : un plafond continu multiplierait les entrées de
      // cache sans rien garantir de plus.
      // Le budget global, lui, ne décide que du NOMBRE de fragments cherchés.
      ctxRecherche.maxTravail = options.maxTravail
        ?? (epuise ? BUDGET_TRAVAIL_RESERVE : BUDGET_TRAVAIL);
      ctxRecherche.budgetMs = options.budgetMs ?? BUDGET_MS_FILET;
      const avant = ctxRecherche.travail || 0;
      parFrag.set(cle, chercherSix(f.texte, ctxRecherche));
      travailRestant -= (ctxRecherche.travail || 0) - avant;
      cherches++;
    }
    if (ctxRecherche.tronque && !ctxRecherche.tronqueTemps) tronqueTravail = true;
    if (ctxRecherche.tronqueTemps) tronqueTemps = true;

    const ctxAssemblage = { saisie, jetons, signifiants, catalogue };
    let approches = assembler(saisie, frags, parFrag, ctxAssemblage);

    if (!approches.length) {
      const j = approcheJoker(saisie, ctxAssemblage); // garantie absolue (§5.3)
      if (j) approches = [j];
    }

    const ctxScore = { saisie, signifiants };
    for (const a of approches) noter(a, ctxScore);
    approches.sort(ordreTotal);

    // Le joker est affiché et assumé, en bas de liste (§0.4). Il n'est plus le
    // seul : le DÉCRET — un unique 6 recopié trois fois — porte désormais son
    // propre malus (`MALUS.decret`, ×0,40), si bien que le classement suffit à
    // le renvoyer en fond de liste sans qu'on ait à l'y pousser à la main. Ce
    // qui compte, et qui est vérifié plus bas, c'est qu'il ne passe JAMAIS
    // devant une approche qui produit réellement trois 6.
    const jokers = approches.filter((a) => a.mode === 'JOKER');
    const honnetes = approches.filter((a) => a.mode !== 'JOKER');
    const retenues = diversifier(honnetes, { limite: REGLAGES.MAX_APPROCHES - (jokers.length ? 1 : 0) });
    if (jokers.length) retenues.push(jokers[0]);
    else if (!retenues.length) {
      const j = approcheJoker(saisie, ctxAssemblage);
      if (j) { noter(j, ctxScore); retenues.push(j); }
    }

    // Les titres sont posés en une passe sur la LISTE, pas approche par
    // approche : c'est la seule façon de garantir que deux lignes ne portent
    // pas le même nom (`titres.js → distinguerTitres`). La distinction se pose
    // sur l'approche, jamais sur la chaîne rendue, pour que `src/app/pont.js`
    // recompose exactement le même titre en changeant de langue.
    nommer(retenues);
    retenues.forEach((a, i) => {
      a.rang = i + 1;
      a.url = ecrire({ saisie, fragments: descripteursDe(a, { nbJetons: jetons.length }) });
      a.joker = a.mode === 'JOKER';
    });

    const listeFragments = [];
    for (const f of frags) {
      // Mêmes chemins canoniques que ceux de l'assemblage : sans quoi la liste
      // des fragments proposerait des URL passant par des étapes décoratives
      // que la liste des approches, elle, a retirées.
      const bruts = parFrag.get(f.texte.normalize('NFC'));
      if (!bruts || !bruts.length) continue;
      const chemins = normaliserChemins(bruts);
      if (!chemins.length) continue;
      listeFragments.push({
        texte: f.texte,
        offset: f.offset,
        longueur: f.longueur,
        famille: f.famille,
        nbChemins: chemins.length,
        url: ecrire({
          saisie,
          fragments: [{
            portee: f.tokenDebut >= 0 && f.tokenLong > 0
              ? { offset: f.tokenDebut, longueur: f.tokenLong } : null,
            resonance: null,
            codes: chemins[0].ops.map((o) => o.code),
          }],
        }),
      });
      if (listeFragments.length >= REGLAGES.MAX_FRAGMENTS) break;
    }

    // ── Marquage de la troncature. Deux natures bien distinctes :
    //  · `tronque` seul — la borne DÉTERMINISTE a mordu. Le résultat est
    //    partiel mais reproductible à l'identique partout : rien à signaler.
    //  · `tronqueTemps` — le filet de sécurité s'est déclenché. Là, et là
    //    seulement, la liste dépend de la charge de la machine : on le DIT,
    //    plutôt que de laisser un rang varier en silence (§4.3).
    const avertissement = tronqueTemps ? BANDEAUX.rechercheTronquee : undefined;
    return {
      saisie,
      dedie,
      vide: false,
      approches: retenues,
      fragments: listeFragments,
      urlResultats: ecrire({ saisie }),
      tronque: tronqueTravail || tronqueTemps,
      tronqueTemps,
      ...(avertissement ? { avertissement } : {}),
    };
  }

  /**
   * Rejoue une URL canonique SANS relancer la recherche (§4.3).
   * @returns {{ok:boolean, approche?:Object, bandeau?:string, raison?:string}}
   */
  function rejouer(lecture) {
    if (!lecture || lecture.forme !== 'canonique') {
      return { ok: false, raison: 'forme non canonique', bandeau: lecture && lecture.bandeau };
    }
    const saisie = lecture.saisie;
    const jetons = tokeniser(saisie);
    const parCode = new Map(ops.map((o) => [o.code, o]));
    const parts = [];

    for (const desc of lecture.fragments) {
      let portees = [];
      if (desc.resonance) {
        const rep = motifsRepetes(jetons)[0];
        if (!rep || rep.occurrences.length < desc.resonance) {
          return { ok: false, raison: 'motif répété introuvable', bandeau: BANDEAUX.formatInconnu };
        }
        portees = rep.occurrences.slice(0, desc.resonance).map((o) => ({
          texte: o.texte, offset: o.offset, longueur: o.longueur,
          intervalles: [[o.offset, o.offset + o.longueur]],
          tokenDebut: jetons.indexOf(o), tokenLong: 1, famille: 'repetition', priorite: 1,
        }));
      } else if (desc.portee) {
        const f = fragmentDePortee(saisie, jetons, desc.portee);
        if (!f) return { ok: false, raison: 'portée hors bornes', bandeau: BANDEAUX.formatInconnu };
        portees = [f];
      } else {
        portees = [{
          texte: saisie, offset: 0, longueur: saisie.length,
          intervalles: [[0, saisie.length]], tokenDebut: 0, tokenLong: jetons.length,
          famille: 'entier', priorite: 5,
        }];
      }

      for (const fragment of portees) {
        const chemin = executerProgramme(fragment.texte, desc.codes, parCode);
        if (!chemin) return { ok: false, raison: 'programme inapplicable', bandeau: BANDEAUX.codeInconnu };
        parts.push({ fragment, chemin });
      }
    }

    // Le mode n'est pas transporté par l'URL : on le redéduit de la géométrie
    // des fragments, exactement comme le fait `assembler`. C'est ce qui garantit
    // qu'un lien rejoué affiche le même score que la liste dont il est issu.
    const approche = { parts, ...deduireMode(parts, { saisie, jetons }) };
    noter(approche, { saisie, signifiants: zonesSignifiantes(saisie) });
    // Hors liste, il n'y a personne dont se distinguer : le titre est celui que
    // `titres.js` compose à partir de la seule signature du chemin.
    approche.titre = titreBilingue(approche);
    approche.regle = regleBilingue(approche);
    approche.url = ecrire({ saisie, fragments: lecture.fragments });
    return { ok: true, approche };
  }

  function scenarioDe(approche, ctx = {}) {
    // La langue traverse jusqu'aux `steps()` du catalogue : sans elle, les libellés
    // repartent en français quelle que soit l'interface (CONTRACTS §0.4, bilinguisme).
    const langue = ctx.langue || 'fr';
    return construireScenario(approche, {
      saisie: ctx.saisie || approche.saisie,
      langue,
      methode: ctx.methode || {
        id: approche.rang ?? 1,
        label: titreApproche(approche, langue),
        rule: regleApproche(approche, langue),
      },
      // Le verdict n'est plus forcément « 666 » : un GROUPEMENT dont le vecteur
      // porte douze 6 en aligne quatre séries, et l'annoncer « 666 » reviendrait
      // à cacher les trois quarts de ce qu'on vient de montrer (`verdictDe`).
      resultat: ctx.resultat || verdictDe(approche),
    });
  }

  return { resoudre, rejouer, scenarioDe, catalogue, bassin, cache, ops };
}

/**
 * Ordre dans lequel les fragments sont CHERCHÉS — distinct de l'ordre dans
 * lequel ils sont affichés (`genererFragments` trie par priorité, §3.3).
 *
 * Seule différence : le fragment « saisie entière » (priorité 5) remonte juste
 * derrière les répétitions. Il porte à lui seul les modes DIRECT et TRIPLEMENT,
 * et sur un mot unique il est le seul assemblage possible ; le laisser en queue
 * reviendrait à le sacrifier le premier quand le budget global s'épuise.
 * Le tri est stable et sans entropie : à priorité égale, l'ordre d'entrée est
 * conservé, donc la recherche reste déterministe.
 */
function ordreDeRecherche(fragments) {
  const rang = (f) => (f.entier || f.famille === 'entier' ? 1.5 : f.priorite);
  return fragments
    .map((f, i) => ({ f, i }))
    .sort((a, b) => (rang(a.f) - rang(b.f)) || (a.i - b.i))
    .map((x) => x.f);
}

function fragmentDePortee(saisie, jetons, portee) {
  const { offset, longueur } = portee;
  if (offset < 0 || longueur <= 0 || offset + longueur > jetons.length) return null;
  const premier = jetons[offset];
  const dernier = jetons[offset + longueur - 1];
  const d = premier.offset;
  const f = dernier.offset + dernier.longueur;
  return {
    texte: saisie.slice(d, f), offset: d, longueur: f - d,
    intervalles: [[d, f]], tokenDebut: offset, tokenLong: longueur,
    famille: 'portee', priorite: 2,
  };
}

function executerProgramme(texte, codes, parCode) {
  let courant = etat('STR', String(texte).normalize('NFC'), [[0, texte.length]]);
  const chemin = { ops: [], etats: [courant], valeur: null, cout: 0 };
  for (const code of codes) {
    const op = parCode.get(code);
    if (!op) return null;
    const apres = appliquerOp(op, courant);
    if (apres === null) return null;
    chemin.ops.push(op);
    chemin.etats.push(apres);
    chemin.cout += op.cout || 0;
    courant = apres;
  }
  chemin.valeur = courant.type === 'NUM' ? courant.valeur : null;
  return chemin;
}

// ══════════════════════════════════ interface postMessage (inline en v1)

/**
 * Protocole : `{type:'resoudre', generation, saisie}` →
 *   `{type:'resultat', generation, …}` ou `{type:'erreur', generation, message}`.
 * Le compteur `generation` permet d'annuler les recherches obsolètes quand
 * l'utilisateur continue de taper (équivalent d'un AbortController).
 */
export function creerCanal(moteur, poster) {
  let generation = 0;
  const envoyer = poster || ((m) => m);
  return {
    get generation() { return generation; },
    /** À brancher sur `worker.onmessage` le jour où l'on passe au Worker. */
    traiter(message) {
      if (!message || message.type !== 'resoudre') return null;
      generation = message.generation ?? generation + 1;
      try {
        const r = moteur.resoudre(message.saisie);
        return envoyer({ type: 'resultat', generation, ...serialisable(r) });
      } catch (err) {
        return envoyer({ type: 'erreur', generation, message: err.message });
      }
    },
    demander(saisie) {
      return this.traiter({ type: 'resoudre', generation: ++generation, saisie });
    },
  };
}

/** Retire les objets opérateurs (non clonables) avant un éventuel postMessage. */
function serialisable(resultat) {
  return {
    saisie: resultat.saisie,
    dedie: resultat.dedie,
    vide: resultat.vide,
    urlResultats: resultat.urlResultats,
    fragments: resultat.fragments,
    tronque: resultat.tronque,
    tronqueTemps: resultat.tronqueTemps,
    avertissement: resultat.avertissement,
    approches: (resultat.approches || []).map((a) => ({
      rang: a.rang, mode: a.mode, score: a.score, scoreAjuste: a.scoreAjuste,
      decret: a.decret, L: a.L, titre: a.titre,
      regle: a.regle, url: a.url, joker: a.joker, criteres: a.criteres,
      codes: a.codes,
    })),
  };
}

export { lire, ecrire, encoderTexte, descripteursDe };
