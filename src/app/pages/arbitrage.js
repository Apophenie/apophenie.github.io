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
  const vider = e('button.arb__action', { type: 'button', texte: 'Vider la mémoire' });
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
  function composer(cote, hash) {
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
    for (const [cote, hash] of [['Avant', cas.avant], ['Après', cas.apres]]) {
      const vue = composer(cote, hash);
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
