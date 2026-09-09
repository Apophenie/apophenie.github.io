/**
 * LA PAGE D'ARBITRAGE — deux voies côte à côte, et un avis à donner.
 *
 * ★ POURQUOI ELLE EXISTE.
 *
 * Un classement qui change ne se juge pas sur un nombre. Quand une famille
 * d'opérateurs entre au catalogue — les vingt-cinq césars, six mille
 * traductions —, la recherche trouve d'autres voies, et les tests de référence
 * rougissent. Rien, dans ce rouge, ne dit si la nouvelle voie est MEILLEURE :
 * il dit seulement qu'elle est autre. La question — « progrès ou régression, de
 * mon point de vue ? » — n'a qu'un juge, et il lui faut voir les deux
 * démonstrations, pas lire deux scores.
 *
 * D'où cette page : par cas, la voie d'AVANT et celle d'APRÈS, jouées l'une à
 * côté de l'autre par le même moteur, sur la même saisie. Ce qui est comparé
 * est donc bien la VOIE, et non deux versions du code — les deux liens se
 * rejouent aujourd'hui, avec les gestes d'aujourd'hui.
 *
 * ★ LES AVIS SURVIVENT À LA PAGE. Une par cas, sauvegardée à la frappe dans le
 *   stockage local : on peut fermer, revenir, changer de cas et retrouver ce
 *   qu'on avait écrit. Le bouton « bilan » les rassemble en un texte à recopier
 *   — c'est la sortie de cet instrument, sa seule raison d'être.
 *
 * ★ ET ELLE N'EST PAS UNE PAGE DU SITE, comme le récapitulatif du barème : pas
 *   de route, pas d'i18n, pas de lien qui y mène. Un instrument posé à côté.
 */

import * as pont from '../pont.js';
import { e, svg as s } from '../dom.js';
import { creerTransport, brancherClavier } from '../transport.js';
import { creerRegistre } from '../registre.js';
import { titreApproche, regleApproche } from '../libelles.js';
import { CAS_ARBITRAGE } from './arbitrage-cas.js';

/** La clé du stockage local — préfixée, pour ne rien écraser d'autre. */
const CLE = 'nhlg:arbitrage:';

const lire = (id) => {
  try { return globalThis.localStorage?.getItem(CLE + id) ?? ''; } catch { return ''; }
};
const ecrire = (id, texte) => {
  try { globalThis.localStorage?.setItem(CLE + id, texte); } catch { /* stockage refusé : tant pis */ }
};
const oublier = () => {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return;
    for (const cas of CAS_ARBITRAGE) ls.removeItem(CLE + cas.id);
  } catch { /* rien à faire */ }
};

export function pageArbitrage() {
  const racine = e('div.arb', {});
  let courant = 0;
  let scenesVivantes = [];

  // ── la barre de navigation ────────────────────────────────────────────
  const choix = e('select.arb__choix', { 'aria-label': 'Le cas à arbitrer' },
    CAS_ARBITRAGE.map((cas, i) => e('option', { value: String(i), texte: `${i + 1}. ${cas.titre}` })));
  const precedent = e('button.arb__fleche', { type: 'button', texte: '←', 'aria-label': 'Cas précédent' });
  const suivant = e('button.arb__fleche', { type: 'button', texte: '→', 'aria-label': 'Cas suivant' });
  const barre = e('nav.arb__barre', {}, [precedent, choix, suivant]);

  // ── les deux scènes ───────────────────────────────────────────────────
  const scenes = e('div.arb__scenes', {});

  // ── l'avis ────────────────────────────────────────────────────────────
  const avis = e('textarea.arb__avis', {
    rows: '10',
    'aria-label': 'Ce que je préfère, et pourquoi',
    spellcheck: 'false',
  });
  const bilan = e('button.arb__action', { type: 'button', texte: 'Bilan' });
  // Rejeté à droite : voisin de « Bilan », il offrait de tout perdre d'un clic
  // mal visé — et l'un affiche quand l'autre détruit sans retour.
  const vider = e('button.arb__action.arb__action--danger', { type: 'button', texte: 'Vider la mémoire' });
  const sortie = e('pre.arb__bilan', { hidden: 'hidden' });

  racine.append(
    e('h1.arb__titre', { texte: 'Arbitrage — avant / après' }),
    e('p.arb__note', {
      texte: 'Les deux liens sont rejoués par le moteur ACTUEL : ce qui est comparé, '
        + 'ce sont les deux voies, pas deux versions du code. Les avis sont gardés '
        + 'dans ce navigateur, un par cas.',
    }),
    barre,
    scenes,
    e('div.arb__avis-bloc', {}, [
      e('label.arb__label', { texte: 'Ce que je préfère, et pourquoi' }),
      avis,
      e('div.arb__actions', {}, [bilan, vider]),
      sortie,
    ]),
  );

  /** Détruit proprement les lecteurs en place — sinon deux timelines tournent. */
  function nettoyer() {
    for (const v of scenesVivantes) v.detruire();
    scenesVivantes = [];
    scenes.replaceChildren();
  }

  /**
   * Une scène, à partir d'un lien. Le chemin est celui du site : grammaire
   * d'URL → rejeu → scénario → lecteur. Aucun raccourci, sinon la page
   * montrerait autre chose que ce qu'un visiteur verrait.
   */
  /**
   * ★ **LES SCORES D'UNE VOIE, EN DIRECT ET TELS QUE RELEVÉS.**
   *
   * > « Mets-les en AB-testing.html avec leur score global, classement, et les
   * >   4 sous-métriques affichées ainsi que les 6 métriques internes. »
   * >   (l'auteur)
   *
   * Le global et les quatre axes sont RECALCULÉS ici par le même chemin que la
   * carte de la liste (`pont.scoresParAxe`, `pont.pourcentagesDe` au défaut) ;
   * les six critères sont lus sur l'approche rejouée. Les deux RANGS, eux, ne se
   * calculent pas sur une voie seule — ils viennent de la liste entière, au
   * moment du relevé —, donc ils sont ÉCRITS dans le cas (`mesure`), et le
   * global relevé avec eux : si l'écran et le relevé divergeaient, la ligne
   * « relevé » le dirait en rouge, plutôt que de laisser croire que la mesure
   * tient encore.
   */
  function scoresDe(approche, mesure) {
    const axes = pont.scoresParAxe(approche);
    if (!axes) return e('span', {});
    const parts = pont.pourcentagesDe(pont.CURSEURS_DEFAUT());
    let somme = 0;
    let poids = 0;
    for (const axe of pont.CURSEURS()) {
      if (axes[axe] === null || axes[axe] === undefined) continue;
      somme += (parts[axe] ?? 0) * axes[axe];
      poids += parts[axe] ?? 0;
    }
    const global = poids ? Math.round(somme / poids) : null;
    const c = approche.criteres || {};
    const paire = (nom, val) => [e('dt', { texte: nom }), e('dd', { texte: val === null || val === undefined ? '—' : String(val) })];
    const ligne = (classe, paires) => e('dl.arb__scores-ligne' + (classe ? '.' + classe : ''), {}, paires.flat());
    const bloc = e('div.arb__scores', {}, [
      ligne('arb__scores-rang', [
        paire('global', global),
        paire('score moteur', approche.score),
        ...(mesure ? [paire('rang moteur', mesure.rangMoteur), paire('rang par le global', mesure.rangGlobal)] : []),
      ]),
      ligne(null, [
        paire('simplicité', axes.simplicite), paire('exhaustivité', axes.exhaustivite),
        paire('quantité', axes.quantite), paire('cohérence', axes.coherence),
      ]),
      ligne(null, [
        paire('H', c.H), paire('N', c.N), paire('U', c.U), paire('C', c.C), paire('A', c.A), paire('E', c.E),
        paire('R', c.R), paire('séries', approche.series ?? (approche.bilan && approche.bilan.series)),
      ]),
    ]);
    /* ⚠️ **UNE SEULE NOTATION À L'ÉCRAN, ET C'EST CELLE DU MOTEUR.**

       > « Pas besoin de mentionner v2. Il y a ce qui est branché dans le
       >   moteur, et ce qu'on envisage de mettre à la place. » (l'auteur)

       Une seconde ligne portait les axes d'un barème d'étude, préfixés « v2 »,
       à côté de ceux d'aujourd'hui. Elle demandait au lecteur d'arbitrer entre
       deux notations en même temps qu'entre deux voies, et elle vieillissait
       seule : ces nombres venaient d'un relevé daté, que rien ne rafraîchit
       quand le moteur bouge. Ce qui s'arbitre ici, ce sont DEUX VOIES ; elles
       se lisent toutes deux au barème en place, et le jour où un autre barème
       prend sa place, c'est lui qu'on lira. */
    /* ★ **UNE VOIE QUI A QUITTÉ LA LISTE DOIT SE VOIR** — sans quoi l'arbitrage
         se rend sur une comparaison qui n'existe plus. Au dernier relevé, sept
         des seize cas avaient perdu au moins un de leurs deux côtés : les
         listes ont changé, et la voie n'est plus proposée au cran et aux
         curseurs du cas. Le lien reste rejouable — c'est la garantie du §4.3 —
         mais le classement ne la contient plus. */
    if (mesure && mesure.absente) {
      bloc.append(e('p.arb__scores-ecart', {
        texte: '⚠ cette voie n’est plus proposée dans la liste, au cran et aux réglages de ce cas. '
          + 'Le lien la rejoue toujours ; l’arbitrage, lui, porte sur une comparaison périmée.',
      }));
    } else if (mesure && mesure.score !== null && mesure.score !== undefined
      && (mesure.global !== global || mesure.score !== approche.score)) {
      bloc.append(e('p.arb__scores-ecart', {
        texte: `⚠ relevé : global ${mesure.global}, score ${mesure.score} — l’écran dit autre chose : `
          + 'le classement a bougé depuis la mesure, les rangs ci-dessus ne tiennent plus.',
      }));
    }
    return bloc;
  }

  function composer(cote, hash, mesure = null) {
    const cadre = e('section.arb__cote', {}, [e('h2.arb__cote-titre', { texte: cote })]);
    let lecture = null;
    let rejeu = null;
    try {
      lecture = pont.lireHash(hash);
      rejeu = lecture ? pont.rejouer(lecture) : null;
    } catch (err) {
      rejeu = { ok: false, raison: err && err.message };
    }
    if (!rejeu || !rejeu.ok) {
      cadre.append(e('p.arb__alerte', {
        texte: `Ce lien ne se rejoue pas : ${(rejeu && rejeu.raison) || 'grammaire refusée'}.`,
      }), e('code.arb__lien', { texte: hash }));
      return { element: cadre, detruire() {} };
    }

    const { scenario } = pont.scenarioDe(rejeu.approche, lecture.saisie, { registre: lecture.registre });
    const svg = s('svg', {
      class: 'scene', 'aria-hidden': 'true', focusable: 'false',
      preserveAspectRatio: 'xMidYMid meet',
    });
    const boite = e('div.scene-cadre', {
      role: 'group', tabindex: '0', 'aria-label': `La scène — ${cote}`,
    }, [svg]);
    const { lecteur } = pont.creerLecteur(svg, scenario, {
      reducedMotion: 'auto',
      speed: 1,
      repeatSpeed: pont.facteurRepetitions(),
      scenographie: lecture.registre !== pont.REGISTRE_DEFAUT,
      // ★ Pas d'autoplay : deux scènes qui partent ensemble se disputent
      //   l'attention, et l'on ne compare plus rien. On les lance à la main,
      //   celle qu'on veut, quand on veut.
      autoplay: false,
    });
    const transport = creerTransport(lecteur, {}, { repetitions: pont.facteurRepetitions() });
    const registre = creerRegistre(lecteur, { titre: titreApproche(rejeu.approche) });
    const detacher = brancherClavier(boite, lecteur);
    const regle = regleApproche(rejeu.approche);

    cadre.append(
      e('p.arb__voie', { texte: rejeu.approche.codes || '' }),
      regle ? e('p.arb__regle', { texte: regle }) : e('span', {}),
      scoresDe(rejeu.approche, mesure),
      boite,
      transport.element,
      registre.element,
      registre.regionLive,
      e('code.arb__lien', { texte: hash }),
    );
    return {
      element: cadre,
      detruire() {
        detacher();
        registre.detruire();
        transport.detruire();
        if (typeof lecteur.destroy === 'function') lecteur.destroy();
      },
    };
  }

  function montrer(i) {
    courant = Math.max(0, Math.min(CAS_ARBITRAGE.length - 1, i));
    const cas = CAS_ARBITRAGE[courant];
    choix.value = String(courant);
    precedent.disabled = courant === 0;
    suivant.disabled = courant === CAS_ARBITRAGE.length - 1;
    nettoyer();
    // La saisie est la même des deux côtés : elle n'a pas à être répétée sous
    // chaque scène, elle titre le cas.
    scenes.append(e('p.arb__saisie', { texte: `« ${cas.saisie} »` }));
    // ★ Un cas de CLASSEMENT n'oppose pas un avant et un après : il oppose la
    //   tête que le moteur classe première à celle que le score global affiché
    //   mettrait en tête. Les côtés sont nommés pour ce qu'ils sont.
    const classement = cas.question === 'classement';
    // Les deux côtés d'un cas de barème : la tête d'aujourd'hui, et celle qui
    // prendrait sa place. Ce ne sont pas deux notations, ce sont deux voies.
    const barème = cas.question === 'bareme';
    const cotes = barème
      ? [['Aujourd’hui', cas.avant, cas.mesure && cas.mesure.avant],
        ['Ce qu’on mettrait à la place', cas.apres, cas.mesure && cas.mesure.apres]]
      : classement
        ? [['Tête du moteur', cas.avant, cas.mesure && cas.mesure.avant],
          ['Tête par le score global', cas.apres, cas.mesure && cas.mesure.apres]]
        : [['Avant', cas.avant, null], ['Après', cas.apres, null]];
    for (const [cote, hash, mesure] of cotes) {
      const vue = composer(cote, hash, mesure);
      scenesVivantes.push(vue);
      scenes.append(vue.element);
    }
    // ★ L'avis PRÉ-RENSEIGNÉ des deux liens : on écrit sous les yeux ce dont on
    //   parle, et le bilan se recopie tel quel dans une conversation.
    const garde = lire(cas.id);
    avis.value = garde || `${cas.titre}\n  avant : ${cas.avant}\n  après : ${cas.apres}\n\n`;
    sortie.hidden = true;
  }

  avis.addEventListener('input', () => ecrire(CAS_ARBITRAGE[courant].id, avis.value));
  choix.addEventListener('change', () => montrer(Number(choix.value)));
  precedent.addEventListener('click', () => montrer(courant - 1));
  suivant.addEventListener('click', () => montrer(courant + 1));
  bilan.addEventListener('click', () => {
    const morceaux = CAS_ARBITRAGE.map((cas, i) => {
      const texte = (i === courant ? avis.value : lire(cas.id)).trim();
      return texte ? `── ${i + 1}. ${cas.titre}\n${texte}` : null;
    }).filter(Boolean);
    sortie.textContent = morceaux.length ? morceaux.join('\n\n') : 'Aucun avis saisi.';
    sortie.hidden = false;
  });
  vider.addEventListener('click', () => {
    oublier();
    sortie.hidden = true;
    montrer(courant);
  });

  montrer(0);
  return racine;
}
